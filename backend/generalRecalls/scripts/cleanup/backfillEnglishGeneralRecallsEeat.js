"use strict";

/**
 * backfillEnglishGeneralRecallsEeat.js
 *
 * Goal:
 * - Improve English-only copy for CPSC/general recalls for EEAT/SEO.
 * - Preserve schema and factual fields; do NOT invent facts.
 * - Avoid duplication: keep action steps in Remedies/ConsumerContact, not in Description.
 * - Write to a new output file (never overwrite source by default).
 *
 * Default input:
 *   backend/generalRecalls/data/general_recalls.flattened.json
 *
 * Default output:
 *   backend/generalRecalls/data/new-generalRecalls-en-eeat.json
 *
 * Logs/hashes:
 *   backend/generalRecalls/data/logs/backfillEnglishGeneralRecallsEeat.hashes.json
 *   backend/generalRecalls/data/logs/backfillEnglishGeneralRecallsEeat.run-log.json
 *
 * Usage (from backend/ or repo root):
 *   node backend/generalRecalls/scripts/cleanup/backfillEnglishGeneralRecallsEeat.js
 *   node ... --slug=some-slug --limit=1
 *   node ... --resume
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PIPELINE_ROOT = path.join(__dirname, "..", "..");
const DATA_ROOT = path.join(PIPELINE_ROOT, "data");
const LOGS_ROOT = path.join(DATA_ROOT, "logs");
const BACKEND_ROOT = path.join(PIPELINE_ROOT, "..");
const ENV_ROOT = path.join(BACKEND_ROOT, "scripts");

require("dotenv").config({
  path: fs.existsSync(path.join(ENV_ROOT, ".env"))
    ? path.join(ENV_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_GENERAL_EN_BACKFILL_MODEL || "gpt-4.1-mini";

const INPUT_PATH_DEFAULT = path.join(DATA_ROOT, "general_recalls.flattened.json");
const OUTPUT_PATH_DEFAULT = path.join(DATA_ROOT, "new-generalRecalls-en-eeat.json");
const HASH_PATH_DEFAULT = path.join(LOGS_ROOT, "backfillEnglishGeneralRecallsEeat.hashes.json");
const LOG_PATH_DEFAULT = path.join(LOGS_ROOT, "backfillEnglishGeneralRecallsEeat.run-log.json");

const OPENAI_TIMEOUT_MS = 60000;
const OPENAI_MAX_RETRIES = 4;
const RATE_LIMIT_MS = 150;

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJsonArraySafe(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(p, arr) {
  fs.writeFileSync(p, JSON.stringify(arr, null, 2), "utf8");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function progressBar(current, total, width = 30) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(current, safeTotal) / safeTotal;
  const filled = Math.round(ratio * width);
  const bar = "#".repeat(filled) + "-".repeat(width - filled);
  const pct = String(Math.round(ratio * 100)).padStart(3);
  return `[${bar}] ${pct}%`;
}

function fmtElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function uiHeader(title) {
  const line = "=".repeat(58);
  console.log(`\n${C.cyan}${C.bold}  ${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${line}${C.reset}\n`);
}

function uiInfo(label, value) {
  const l = String(label).padEnd(22);
  console.log(`     ${C.dim}${l}${C.reset}${value}`);
}

function uiOk(msg) {
  console.log(`  ${C.green}✓${C.reset} ${msg}`);
}

function uiWarn(msg) {
  console.log(`  ${C.yellow}!${C.reset} ${msg}`);
}

function uiErr(msg) {
  console.log(`  ${C.red}x${C.reset} ${msg}`);
}

function parseArgs() {
  const flags = process.argv.slice(2);
  const out = {
    input: INPUT_PATH_DEFAULT,
    output: OUTPUT_PATH_DEFAULT,
    hashFile: HASH_PATH_DEFAULT,
    logFile: LOG_PATH_DEFAULT,
    slug: null,
    limit: null,
    resume: flags.includes("--resume"),
  };
  for (const flag of flags) {
    if (flag.startsWith("--input=")) out.input = path.resolve(flag.slice(8));
    if (flag.startsWith("--output=")) out.output = path.resolve(flag.slice(9));
    if (flag.startsWith("--hashfile=")) out.hashFile = path.resolve(flag.slice(11));
    if (flag.startsWith("--logfile=")) out.logFile = path.resolve(flag.slice(10));
    if (flag.startsWith("--slug=")) out.slug = flag.slice(7).trim();
    if (flag.startsWith("--limit=")) out.limit = Number(flag.slice(8));
  }
  return out;
}

// Fix common mojibake artifacts without rewriting meaning.
function fixMojibake(s) {
  if (!s || typeof s !== "string") return s;
  return s
    .replace(/\u00e2\u20ac\u201c|\u00e2\u20ac\u009c/g, "\"")
    .replace(/\u00e2\u20ac\u201d|\u00e2\u20ac\u009d/g, "\"")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u2019/g, "'")
    .replace(/\u00e2\u20ac\u2013/g, "-")
    .replace(/\u00e2\u20ac\u2014/g, "-")
    .replace(/\u00c3\u201a\u00c2\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceHash(obj) {
  const h = crypto.createHash("sha256");
  h.update(JSON.stringify(obj));
  return h.digest("hex");
}

function readHashes(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeHashes(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function readRunLog(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    successes: [],
    failures: [],
    summary: { processed: 0, saved: 0, skipped: 0, failed: 0 },
  };
}

function flushRunLog(p, log) {
  ensureDir(path.dirname(p));
  log.finishedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(log, null, 2), "utf8");
}

async function openaiRewriteEnglish({ title, metaDescription, description, url, hazards, remedies, injuries }) {
  if (!OPENAI_API_KEY) {
    return { ok: false, reason: "missing-openai-api-key" };
  }

  const payload = {
    title: fixMojibake(title || ""),
    metaDescription: fixMojibake(metaDescription || ""),
    description: fixMojibake(description || ""),
    url: url || "",
    hazards: Array.isArray(hazards) ? hazards.map((h) => fixMojibake(h?.Name || "")).filter(Boolean) : [],
    remedies: Array.isArray(remedies) ? remedies.map((r) => fixMojibake(r?.Name || "")).filter(Boolean) : [],
    injuries: Array.isArray(injuries) ? injuries.map((i) => fixMojibake(i?.Name || "")).filter(Boolean) : [],
  };

  const instruction = [
    "You are an editor for a public safety recall publisher.",
    "Rewrite English copy for EEAT/SEO while staying strictly factual.",
    "Do NOT invent facts. Do NOT add numbers, dates, retailers, or injury counts unless provided.",
    "Goal: clearer and more useful than a raw notice, without being long or repetitive.",
    "",
    "Return ONLY valid JSON with exactly these keys:",
    '{ "title": string, "metaDescription": string, "description": string }',
    "",
    "Rules:",
    "- title: descriptive, specific, not generic; keep brand/product terms as-is; avoid clickbait.",
    "- metaDescription: 140-170 chars, plain language, includes hazard keyword if possible; no quotes; no ellipses.",
    "- description: 2-4 short sentences explaining what was recalled and why; include injury status only if explicitly provided; NO step-by-step actions.",
    "- Do not include contact instructions in description (those belong elsewhere).",
    "- Keep a formal, safety-oriented tone.",
    "",
    "Source URL (for context only, do not fetch):",
    payload.url,
  ].join("\n");

  function extractJsonObject(maybeText) {
    if (!maybeText || typeof maybeText !== "string") return null;
    let t = maybeText.trim();
    // Strip common fenced blocks.
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    // If there's extra text, grab the first {...} block.
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return t.slice(first, last + 1).trim();
    }
    return t;
  }

  for (let attempt = 1; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          input: `${instruction}\n\nINPUT:\n${JSON.stringify(payload, null, 2)}`,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const reason = `http-${res.status}`;
        if (attempt < OPENAI_MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
          clearTimeout(timer);
          await delay(1500 * attempt);
          continue;
        }
        clearTimeout(timer);
        return { ok: false, reason };
      }

      const data = await res.json();
      const rawText = (data.output_text || data.output?.[0]?.content?.[0]?.text || "").trim();
      const text = extractJsonObject(rawText);
      clearTimeout(timer);

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, reason: "bad-json" };
      }

      const outTitle = fixMojibake(parsed?.title || "");
      const outMeta = fixMojibake(parsed?.metaDescription || "");
      const outDesc = fixMojibake(parsed?.description || "");

      if (!outTitle || !outMeta || !outDesc) return { ok: false, reason: "missing-fields" };
      if (outMeta.length < 90 || outMeta.length > 220) return { ok: false, reason: "metaDescription-length" };

      return { ok: true, title: outTitle, metaDescription: outMeta, description: outDesc };
    } catch (e) {
      const reason = e && typeof e.message === "string" ? e.message : String(e);
      if (attempt < OPENAI_MAX_RETRIES) {
        await delay(1500 * attempt);
        continue;
      }
      return { ok: false, reason: reason.includes("abort") ? "timeout" : reason };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: "unknown" };
}

function makeEnglishSource(row) {
  const en = row?.languages?.en || {};
  return {
    slug: row?.slug || "",
    url: row?.URL || "",
    title: en.Title || row?.Title || "",
    metaDescription: en.metaDescription || row?.metaDescription || "",
    description: en.Description || row?.Description || "",
    hazards: en.Hazards || row?.Hazards || [],
    remedies: en.Remedies || row?.Remedies || [],
    injuries: en.Injuries || row?.Injuries || [],
  };
}

function applyEnglishRewrite(row, rewritten) {
  if (!row.languages || typeof row.languages !== "object") row.languages = {};
  if (!row.languages.en || typeof row.languages.en !== "object") row.languages.en = {};

  row.Title = rewritten.title;
  row.metaDescription = rewritten.metaDescription;
  row.Description = rewritten.description;

  row.languages.en.Title = rewritten.title;
  row.languages.en.metaDescription = rewritten.metaDescription;
  row.languages.en.Description = rewritten.description;

  // Also clean common mojibake across existing English-only fields we keep.
  if (typeof row.ConsumerContact === "string") row.ConsumerContact = fixMojibake(row.ConsumerContact);
  if (typeof row.languages.en.ConsumerContact === "string") row.languages.en.ConsumerContact = fixMojibake(row.languages.en.ConsumerContact);

  if (Array.isArray(row.Images)) {
    row.Images = row.Images.map((img) => ({
      ...img,
      Caption: fixMojibake(img?.Caption || ""),
    }));
  }
  if (Array.isArray(row.languages.en.Images)) {
    row.languages.en.Images = row.languages.en.Images.map((img) => ({
      ...img,
      Caption: fixMojibake(img?.Caption || ""),
    }));
  }
  return row;
}

async function main() {
  const args = parseArgs();
  ensureDir(LOGS_ROOT);
  ensureDir(path.dirname(args.output));

  uiHeader("Recalls Atlas  ·  General Recalls (EN) EEAT Backfill");
  uiInfo("Input", args.input);
  uiInfo("Output", args.output);
  uiInfo("Hashes", args.hashFile);
  uiInfo("Run log", args.logFile);
  uiInfo("Model", MODEL);
  if (args.slug) uiInfo("Slug filter", args.slug);
  if (args.limit) uiInfo("Limit", String(args.limit));
  console.log("");

  const list = readJsonArraySafe(args.input);
  const hashes = readHashes(args.hashFile);
  const runLog = readRunLog(args.logFile);

  let rows = list;
  if (args.slug) rows = rows.filter((r) => (r.slug || "") === args.slug);
  if (args.limit && Number.isFinite(args.limit) && args.limit > 0) rows = rows.slice(0, Math.floor(args.limit));

  uiInfo("Records", String(rows.length));
  console.log("");

  const outputExisting = args.resume ? readJsonArraySafe(args.output) : [];
  const outputBySlug = new Map(outputExisting.map((r) => [r.slug, r]));

  const started = Date.now();
  let processed = 0;
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    processed++;
    const slug = row?.slug || "(missing-slug)";
    const src = makeEnglishSource(row);
    const h = sourceHash(src);

    if (args.resume && hashes[slug] && hashes[slug] === h && outputBySlug.has(slug)) {
      skipped++;
      runLog.successes.push({ slug, action: "skipped", at: new Date().toISOString() });
      runLog.summary = { processed, saved, skipped, failed };
      flushRunLog(args.logFile, runLog);
      continue;
    }

    console.log(`  ${C.bold}[${processed}/${rows.length}]${C.reset} ${fixMojibake(src.title || slug).slice(0, 70)}`);

    await delay(RATE_LIMIT_MS);
    const rewritten = await openaiRewriteEnglish({
      title: src.title,
      metaDescription: src.metaDescription,
      description: src.description,
      url: src.url,
      hazards: src.hazards,
      remedies: src.remedies,
      injuries: src.injuries,
    });

    if (!rewritten.ok) {
      failed++;
      uiErr(`${slug}  openai-fail: ${rewritten.reason}`);
      runLog.failures.push({ slug, reason: rewritten.reason, at: new Date().toISOString() });
      runLog.summary = { processed, saved, skipped, failed };
      flushRunLog(args.logFile, runLog);
      continue;
    }

    const updated = applyEnglishRewrite({ ...row }, rewritten);
    outputBySlug.set(slug, updated);
    hashes[slug] = h;
    writeHashes(args.hashFile, hashes);

    // Write full output after every row (resume-safe)
    const merged = list.map((r) => outputBySlug.get(r.slug) || r);
    writeJsonArray(args.output, merged);

    saved++;
    uiOk(`${slug}  saved`);
    runLog.successes.push({ slug, action: "saved", at: new Date().toISOString() });
    runLog.summary = { processed, saved, skipped, failed };
    flushRunLog(args.logFile, runLog);

    const elapsed = Date.now() - started;
    console.log(`  ${C.dim}${progressBar(processed, rows.length)}  elapsed ${fmtElapsed(elapsed)}${C.reset}\n`);
  }

  uiDivider();
  uiOk(`Done. processed=${processed} saved=${saved} skipped=${skipped} failed=${failed}`);
}

function uiDivider() {
  console.log(`  ${C.dim}${"-".repeat(58)}${C.reset}`);
}

main().catch((e) => {
  uiDivider();
  uiErr(e?.message || String(e));
  process.exit(1);
});
