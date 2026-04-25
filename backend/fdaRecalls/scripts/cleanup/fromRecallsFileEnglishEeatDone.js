"use strict";

/**
 * fromRecallsFileEnglishEeatDone.js
 *
 * English-only E-E-A-T + SEO pass on FDA recalls from recalls.json.
 * Does not modify recalls.json. Writes a new file with improved copy and
 * English-only `languages: { en }`, stripped of other locales.
 *
 * Defaults:
 *   Input:  backend/fdaRecalls/data/recalls.json
 *   Output: backend/fdaRecalls/data/fromRecallsFile-english-only-EEAT-DONE.json
 *   Hashes: backend/fdaRecalls/data/logs/fromRecallsFileEnglishEeatDone.hashes.json
 *   Log:    backend/fdaRecalls/data/logs/fromRecallsFileEnglishEeatDone.run-log.json
 *
 * Env:
 *   OPENAI_API_KEY (required)
 *   OPENAI_EEAT_FROM_RECALLS_MODEL (optional, default gpt-4.1-mini)
 *
 * Usage (from repo root):
 *   node backend/fdaRecalls/scripts/cleanup/fromRecallsFileEnglishEeatDone.js
 *   node ... --resume
 *   node ... --pending
 *   node ... --slug=some-slug --limit=1
 *   node ... --input=... --output=...
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
const MODEL = process.env.OPENAI_EEAT_FROM_RECALLS_MODEL || "gpt-4.1-mini";
const OPENAI_TIMEOUT_MS = 90000;
const OPENAI_MAX_RETRIES = 4;
const RATE_LIMIT_MS = 120;

const INPUT_PATH = path.join(DATA_ROOT, "recalls.json");
const OUTPUT_PATH = path.join(DATA_ROOT, "fromRecallsFile-english-only-EEAT-DONE.json");
const HASH_PATH = path.join(LOGS_ROOT, "fromRecallsFileEnglishEeatDone.hashes.json");
const LOG_PATH = path.join(LOGS_ROOT, "fromRecallsFileEnglishEeatDone.run-log.json");

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function parseArgs() {
  const flags = process.argv.slice(2);
  const out = {
    input: INPUT_PATH,
    output: OUTPUT_PATH,
    hashFile: HASH_PATH,
    logFile: LOG_PATH,
    slug: null,
    limit: null,
    test: flags.includes("--test"),
  };
  for (const flag of flags) {
    if (flag.startsWith("--input=")) out.input = path.resolve(flag.slice(8));
    if (flag.startsWith("--output=")) out.output = path.resolve(flag.slice(9));
    if (flag.startsWith("--hashfile=")) out.hashFile = path.resolve(flag.slice(11));
    if (flag.startsWith("--logfile=")) out.logFile = path.resolve(flag.slice(10));
    if (flag.startsWith("--slug=")) out.slug = flag.slice(7).trim();
    if (flag.startsWith("--limit=")) out.limit = Number(flag.slice(8));
  }
  if (out.test && (out.limit == null || !Number.isFinite(out.limit) || out.limit < 1)) {
    out.limit = 1;
  }
  return out;
}

function readJsonArray(p) {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Expected array: ${p}`);
  return parsed;
}

function readJsonObject(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(p, v) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(v, null, 2), "utf8");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanText(value) {
  return normalizeWhitespace(value);
}

function stripHtml(value) {
  return normalizeWhitespace(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
  );
}

function firstSentence(text, maxLen = 280) {
  const t = normalizeWhitespace(text);
  if (!t) return "";
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  const sentence = normalizeWhitespace(m ? m[0] : t);
  if (sentence.length <= maxLen) return sentence;
  return `${sentence.slice(0, maxLen - 1).trimEnd()}…`;
}

function uniqueArray(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function findSection(content, patterns) {
  const sections = Array.isArray(content) ? content : [];
  return sections.find((section) => {
    const subtitle = cleanText(section?.subtitle || "").toLowerCase();
    return patterns.some((pattern) => pattern.test(subtitle));
  });
}

function deriveExistingTexts(recall) {
  const content = Array.isArray(recall?.content) ? recall.content : [];
  const summary = findSection(content, [/^recall summary$/i, /^summary$/i]);
  const action = findSection(content, [/what consumers should do/i, /what you should do/i]);
  const source = findSection(content, [/official source/i, /source and verification/i]);
  const about = findSection(content, [/about the company/i]);
  const facts = findSection(content, [/what was recalled/i]);
  return {
    summarySection: summary || null,
    actionSection: action || null,
    sourceSection: source || null,
    factsSection: facts || null,
    aboutText: stripHtml(about?.text || ""),
    summaryHtml: String(summary?.text || ""),
    summaryText: stripHtml(summary?.text || ""),
    actionText: stripHtml(action?.text || ""),
    sourceText: stripHtml(source?.text || ""),
  };
}

function deriveInjuryContext(recall, existing) {
  const haystack = [
    cleanText(recall?.reason || ""),
    cleanText(recall?.description || ""),
    cleanText(existing?.summaryText || ""),
    cleanText(existing?.sourceText || ""),
  ].join(" ");
  if (
    /\b(no (?:injur(?:y|ies)|adverse events?|incidents?)(?: have been | )?(?:reported|to date)?|no reported injuries|illnesses have not been reported)\b/i.test(
      haystack
    )
  ) {
    return "The source text indicates no injuries or adverse events have been reported, or similar.";
  }
  if (/\b(injur|adverse event|hospitali|death|illness|incident)\b/i.test(haystack)) {
    return "The source text references injuries, adverse events, or similar—preserve wording; do not exaggerate.";
  }
  return "Injury/adverse event status: follow the source; do not invent details.";
}

function makeSeoHeadline(recall) {
  const current = cleanText(recall?.headline || "");
  if (current && !/^product recall$/i.test(current)) return current;
  const t = cleanText(recall?.title || "");
  if (t && !/^product recall$/i.test(t)) return t;
  const entity = cleanText(recall?.brandName || recall?.companyName || "");
  const product = cleanText(recall?.productDescription || "Product");
  const reason = cleanText(recall?.reason || "a safety issue");
  if (entity) return cleanText(`${entity} Recalls ${product} — ${reason}`);
  return cleanText(`Recall: ${product} — ${reason}`);
}

function makeSeoTitle(recall, headlineOverride = "") {
  const current = cleanText(recall?.title || "");
  if (current && !/^product recall$/i.test(current)) return current;
  return cleanText(headlineOverride || makeSeoHeadline(recall));
}

function makeDescription(recall) {
  const entity = cleanText(recall?.companyName || recall?.brandName || "The firm");
  const product = cleanText(recall?.productDescription || "a product");
  const reason = cleanText(recall?.reason || "");
  const y = String(recall?.datePublished || recall?.fdaPublishDate || "").slice(0, 4) || "this year";
  let text = `${entity} is recalling ${product}`;
  if (reason) text += ` due to ${reason.toLowerCase()}.`;
  else text += " based on a published company announcement.";
  text += ` This page summarizes the FDA recall notice for ${y}.`;
  text = cleanText(text);
  if (text.length > 165) text = `${text.slice(0, 160).replace(/\s+\S*$/, "")}…`;
  return text;
}

function isWeakDescription(v) {
  const t = cleanText(v);
  return !t || t.length < 60 || /^fda recall notice[.\s]*$/i.test(t);
}

function buildFactsSection(recall) {
  const facts = {
    company: cleanText(recall?.companyName || ""),
    brand: cleanText(recall?.brandName || ""),
    product: cleanText(recall?.productDescription || ""),
    productType: cleanText(recall?.productType || ""),
    reason: cleanText(recall?.reason || ""),
  };
  return Object.fromEntries(Object.entries(facts).filter(([, v]) => v));
}

function buildContactSectionText(contacts) {
  const parts = [];
  if (contacts?.consumers?.organization || contacts?.consumers?.phone || contacts?.consumers?.email) {
    parts.push(
      cleanText(
        `Consumer support: ${[contacts.consumers.organization, contacts.consumers.phone, contacts.consumers.email]
          .filter(Boolean)
          .join(" | ")}`
      )
    );
  }
  if (contacts?.media) {
    const m = contacts.media;
    if (m.name || m.email || m.phone) {
      parts.push(
        cleanText(
          `Media: ${[m.name, m.role, m.email, m.phone]
            .filter(Boolean)
            .join(" | ")}`
        )
      );
    }
  }
  return parts.filter(Boolean).join("\n");
}

function isMarketplaceUrl(u) {
  return /amazon\.com|walmart\.com|ebay\.com|target\.com/i.test(String(u || ""));
}

function buildAuthorityLinks(recall) {
  const links = [];
  const companyWebsite = cleanText(recall?.companyWebsite || "");
  const consumerWebsite = cleanText(recall?.consumerWebsite || "");
  const lotCheckUrl = cleanText(recall?.lotCheckUrl || "");
  if (recall?.sourceUrl) {
    links.push(
      `Read the official FDA notice <a href='${recall.sourceUrl}' target='_blank' rel='noopener noreferrer'>on FDA.gov</a>.`
    );
  }
  if (lotCheckUrl) {
    links.push(
      `If published in the source, you may have lot or return details <a href='${lotCheckUrl}' target='_blank' rel='noopener noreferrer'>here</a>.`
    );
  }
  if (consumerWebsite && !isMarketplaceUrl(consumerWebsite)) {
    links.push(
      `See the company’s consumer information <a href='${consumerWebsite}' target='_blank' rel='noopener noreferrer'>on their website</a>.`
    );
  }
  if (companyWebsite && !isMarketplaceUrl(companyWebsite) && companyWebsite !== consumerWebsite && companyWebsite !== lotCheckUrl) {
    links.push(
      `Company website: <a href='${companyWebsite}' target='_blank' rel='noopener noreferrer'>link</a>.`
    );
  }
  return uniqueArray(links);
}

function buildSourceText(recall) {
  const published = cleanText(recall?.fdaPublishDate || recall?.datePublished || "");
  if (published) {
    return `This summary is based on a U.S. Food and Drug Administration (FDA) recall posting dated ${published}. For the authoritative text, use the official FDA link below.`;
  }
  return "This summary is based on the published FDA notice linked below.";
}

function buildFallbackSummary(recall) {
  const e = cleanText(recall?.brandName || recall?.companyName || "The company");
  const p = cleanText(recall?.productDescription || "the product");
  const r = cleanText(recall?.reason || "");
  let t = `${e} announced a recall affecting ${p}.`;
  if (r) t += ` The notice cites ${r}.`;
  return `<p>${cleanText(t)}</p>`;
}

function buildFallbackAction(recall, existing) {
  if (existing?.actionText) return firstSentence(existing.actionText, 320);
  return cleanText(
    "Stop using any affected product you identify from the details above, then follow the official company or FDA instructions. If you are unsure, contact the firm at the number or email in this page."
  );
}

function buildSourceHash(recall) {
  const payload = {
    slug: recall?.slug || "",
    title: recall?.title || "",
    headline: recall?.headline || "",
    description: recall?.description || "",
    companyName: recall?.companyName || "",
    brandName: recall?.brandName || "",
    productDescription: recall?.productDescription || "",
    productType: recall?.productType || "",
    reason: recall?.reason || "",
    sourceUrl: recall?.sourceUrl || "",
    content: Array.isArray(recall?.content)
      ? recall.content.map((s) => ({
          subtitle: s?.subtitle || "",
          text: stripHtml(s?.text || ""),
          facts: s?.facts || {},
        }))
      : [],
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function stripCodeFences(text) {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return t;
}

function extractJsonObject(maybeText) {
  if (!maybeText || typeof maybeText !== "string") return null;
  let t = stripCodeFences(maybeText);
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return t;
}

/**
 * E-E-A-T: Experience (clear reader value), Expertise (precise, non-alarmist),
 * Authoritative (FDA + dates), Trust (no invented facts, injury language from source only).
 * SEO: specific titles, 140–160 char meta description, deduped body vs action.
 */
function buildEeatPrompt(recall, existing, injuryNote, fallback) {
  return [
    "You edit recall pages for a U.S. consumer health publisher (YMYL).",
    "Improve E-E-A-T and SEO. Output STRICT JSON only, no markdown.",
    "",
    "E-E-A-T: Attribute facts to the official notice; do not add legal/medical advice.",
    "Trust: Never invent dates, lot codes, geographies, injuries, or company statements.",
    "Deduplication: 'recallSummaryHtml' must not repeat the same steps as 'actionText'.",
    "The summary is explanatory; the action paragraph is for concrete consumer steps from the source.",
    "",
    "Return JSON with keys:",
    "title, headline, description, recallSummaryHtml, actionText, keywords",
    "keywords: array of 5–10 short strings (include FDA, year if present in source, product type, hazard if given).",
    "",
    "Rules:",
    "- title, headline: specific, not 'Product Recall'.",
    "- description: ~140–160 characters when possible, meta style, one or two clear sentences; no contact instructions.",
    "- recallSummaryHtml: valid HTML only. Keep <table> and cell values if present; do not alter numbers in tables.",
    "- If source says no injuries/reported illness, state that once clearly.",
    "- actionText: one short paragraph, concrete (stop use, dispose, return, call, check lot) only if in source; else neutral safe wording.",
    "",
    "Slug: " + (recall.slug || ""),
    "Company: " + (recall.companyName || ""),
    "Brand: " + (recall.brandName || ""),
    "Product: " + (recall.productDescription || ""),
    "Reason: " + (recall.reason || ""),
    "Source URL: " + (recall.sourceUrl || ""),
    "FDA / publish: " + (recall.fdaPublishDate || recall.datePublished || ""),
    injuryNote,
    "",
    "FALLBACK if model fails to parse: " + JSON.stringify(fallback),
    "",
    "EXTRACTED SUMMARY HTML (edit, do not delete tables):",
    String(existing.summaryHtml || "").slice(0, 120000),
    "",
    "EXTRACTED ACTION (plain, for actionText):",
    String(existing.actionText || "").slice(0, 20000),
    "",
    "CURRENT title/headline/desc:",
    "title: " + (recall.title || ""),
    "headline: " + (recall.headline || ""),
    "description: " + (recall.description || "").slice(0, 2000),
  ].join("\n");
}

function pickOptimized(model, fallback) {
  if (!model || typeof model !== "object") return fallback;
  return {
    title: cleanText(model.title || fallback.title) || fallback.title,
    headline: cleanText(model.headline || fallback.headline) || fallback.headline,
    description: cleanText(model.description || fallback.description) || fallback.description,
    recallSummaryHtml: String(model.recallSummaryHtml || fallback.recallSummaryHtml || "").trim() || fallback.recallSummaryHtml,
    actionText: cleanText(model.actionText || fallback.actionText) || fallback.actionText,
    keywords: Array.isArray(model.keywords) ? model.keywords.map((k) => cleanText(k)).filter(Boolean) : fallback.keywords,
  };
}

function buildCleanSections(recall, optimized) {
  const existing = deriveExistingTexts(recall);
  const sections = [];
  sections.push({ subtitle: "Recall Summary", text: optimized.recallSummaryHtml });
  const facts = existing.factsSection?.facts && typeof existing.factsSection.facts === "object" ? existing.factsSection.facts : buildFactsSection(recall);
  if (Object.keys(facts).length) sections.push({ subtitle: "What Was Recalled", facts });
  if (optimized.actionText) {
    sections.push({ subtitle: "What You Should Do", text: optimized.actionText });
  }
  const contactText = buildContactSectionText(recall.contacts);
  if (contactText) sections.push({ subtitle: "Company Contact Information", text: contactText });
  if (existing.aboutText) sections.push({ subtitle: "About the Company", text: existing.aboutText });
  sections.push({
    subtitle: "Source and Verification",
    text: buildSourceText(recall),
    authorityLinks: buildAuthorityLinks(recall),
  });
  return sections.filter(
    (s) =>
      cleanText(s.text || "") ||
      (s.facts && Object.keys(s.facts).length) ||
      (Array.isArray(s.authorityLinks) && s.authorityLinks.length)
  );
}

function applyEnglishEeatResult(recall, optimized) {
  const next = JSON.parse(JSON.stringify(recall));
  next.title = optimized.title;
  next.headline = optimized.headline;
  next.description = optimized.description;
  next.keywords = uniqueArray(optimized.keywords?.length ? optimized.keywords : next.keywords);
  next.content = buildCleanSections(next, optimized);
  const en = {
    title: next.title || "",
    headline: next.headline || "",
    description: next.description || "",
    productDescription: next.productDescription || "",
    productType: next.productType || "",
    reason: next.reason || "",
    disclaimer: next.disclaimer || "",
    pageTypeLabel: next.pageTypeLabel || "",
    label: next.label || "",
    regulatedProducts: Array.isArray(next.regulatedProducts)
      ? next.regulatedProducts.join(", ")
      : String(next.regulatedProducts || ""),
    content: next.content,
    dir: "ltr",
    flag: "🇺🇸",
    lang: "en",
  };
  next.languages = { en };
  return next;
}

async function callOpenEeatJson(prompt) {
  if (!OPENAI_API_KEY) return null;
  for (let attempt = 1; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          input: prompt,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (attempt < OPENAI_MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
          await delay(1500 * attempt);
          continue;
        }
        return null;
      }
      const data = await res.json();
      const raw = (data.output_text || data.output?.[0]?.content?.[0]?.text || "").trim();
      const j = extractJsonObject(raw);
      return JSON.parse(j);
    } catch (e) {
      clearTimeout(timer);
      if (attempt < OPENAI_MAX_RETRIES) {
        await delay(1500 * attempt);
        continue;
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function processOne(recall) {
  const existing = deriveExistingTexts(recall);
  const inj = deriveInjuryContext(recall, existing);
  const head = makeSeoHeadline(recall);
  const fallback = {
    title: makeSeoTitle(recall, head),
    headline: head,
    description: isWeakDescription(recall.description) ? makeDescription(recall) : cleanText(recall.description),
    recallSummaryHtml: existing.summaryHtml || buildFallbackSummary(recall),
    actionText: buildFallbackAction(recall, existing),
    keywords: Array.isArray(recall.keywords) ? uniqueArray(recall.keywords) : [],
  };
  if (!existing.summaryHtml && !fallback.recallSummaryHtml) {
    fallback.recallSummaryHtml = buildFallbackSummary(recall);
  }
  const prompt = buildEeatPrompt(recall, existing, inj, fallback);
  const raw = await callOpenEeatJson(prompt);
  const opt = pickOptimized(raw, fallback);
  return applyEnglishEeatResult(recall, { ...opt, keywords: opt.keywords || fallback.keywords });
}

function canSkipByHash(recall, outputBySlug, hashes) {
  const slug = recall.slug || recall.id;
  const already = outputBySlug.get(slug);
  if (!already) return false;
  return hashes[slug] === buildSourceHash(recall);
}

async function main() {
  const args = parseArgs();
  if (!OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY in backend/.env or backend/scripts/.env");
    process.exit(1);
  }

  ensureDir(LOGS_ROOT);
  const fullList = readJsonArray(args.input);
  let workList = fullList;
  if (args.slug) workList = workList.filter((r) => (r.slug || r.id) === args.slug);
  if (Number.isFinite(args.limit) && args.limit > 0) workList = workList.slice(0, Math.floor(args.limit));

  const existingOut = args.resume || args.pending ? readJsonArray(args.output) : [];
  const outputBySlug = new Map(existingOut.map((r) => [r.slug || r.id, r]));
  const hashes = readJsonObject(args.hashFile);

  function canSkip(recall) {
    return canSkipByHash({ recall, outputBySlug, hashes, args });
  }
  const workTotal = args.pending
    ? workList.filter((r) => !canSkip(r)).length
    : workList.length;
  let pendingI = 0;
  if (
    (args.resume || args.pending) &&
    existingOut.length > 0 &&
    existingOut.length < fullList.length - 1 &&
    workList.filter((r) => !canSkip(r)).length > 30
  ) {
    console.log(
      `${C.yellow}WARNING: Output has ${existingOut.length} record(s) but input has ${fullList.length}.` +
        ` Missing slugs = full re-process unless you restore a backup. Hash file does not store full JSON.${C.reset}\n`
    );
  }

  const runLog = { startedAt: new Date().toISOString(), successes: [], failures: [], summary: {} };
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  const t0 = Date.now();
  let rowN = 0;

  console.log(`\n${C.cyan}fromRecallsFile → English E-E-A-T${C.reset}`);
  console.log(`  input:  ${args.input}`);
  console.log(`  output: ${args.output}`);
  console.log(`  model:  ${MODEL}`);
  console.log(`  rows:   ${workList.length} (of ${fullList.length} in file)`);
  if (args.pending) console.log(`  pending to run: ~${workTotal}\n`);
  else console.log("");

  for (const recall of workList) {
    const slug = recall.slug || recall.id;
    rowN += 1;
    if (canSkip(recall)) {
      skipped++;
      if (!args.pending) console.log(`  ${C.yellow}skip${C.reset} [${rowN}/${workList.length}] ${slug}`);
      continue;
    }
    pendingI++;
    if (args.pending) {
      console.log(`  ${C.bold}[${pendingI}/${workTotal}]${C.reset} ${slug}`);
    } else {
      console.log(`  [${rowN}/${workList.length}] ${slug}`);
    }

    await delay(RATE_LIMIT_MS);
    try {
      const updated = await processOne(recall);
      const h = buildSourceHash(recall);
      hashes[slug] = h;
      outputBySlug.set(slug, updated);
      writeJson(args.hashFile, hashes);
      const merged = fullList.map((r) => {
        const s = r.slug || r.id;
        return outputBySlug.get(s) || r;
      });
      writeJson(args.output, merged);
      saved++;
      console.log(`  ${C.green}saved${C.reset} ${slug}`);
    } catch (e) {
      failed++;
      runLog.failures.push({ slug, error: e.message || String(e) });
      console.log(`  ${C.red}fail${C.reset} ${slug} ${e.message || e}`);
    }
  }

  runLog.finishedAt = new Date().toISOString();
  runLog.summary = { saved, skipped, failed, elapsed: fmtElapsed(Date.now() - t0) };
  writeJson(args.logFile, runLog);
  console.log(`\nDone. saved=${saved} skipped=${skipped} failed=${failed} time=${runLog.summary.elapsed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
