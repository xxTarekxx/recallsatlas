"use strict";

/**
 * translateGeneralRecalls10Lang.js
 *
 * Translates cleaned English general recalls into 10 languages (zh, es, ar, hi, pt, ru, fr, ja, de, vi).
 *
 * Input (default):
 *   backend/generalRecalls/data/new-generalRecalls-en-eeat.json
 *
 * Output (default):
 *   backend/generalRecalls/data/generalrecalls-10-lang-clean-eeat.json
 *
 * Resume/logging:
 * - Writes after each language checkpoint and after each recall.
 * - Uses a per-recall source hash so re-runs skip unchanged recalls/languages.
 * - Logs successes/failures to data/logs/translateGeneralRecalls10Lang.run-log.json
 * - Stores hashes in data/logs/translateGeneralRecalls10Lang.hashes.json
 *
 * Usage:
 *   node backend/generalRecalls/scripts/translate/translateGeneralRecalls10Lang.js --resume
 *   node ... --slug=some-slug --limit=1
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
const MODEL = process.env.OPENAI_GENERAL_TRANSLATE_MODEL || "gpt-4.1-mini";

const INPUT_PATH_DEFAULT = path.join(DATA_ROOT, "new-generalRecalls-en-eeat.en-only.validated.json");
const OUTPUT_PATH_DEFAULT = path.join(DATA_ROOT, "generalrecalls-10-lang-clean-eeat.json");
const HASH_PATH_DEFAULT = path.join(LOGS_ROOT, "translateGeneralRecalls10Lang.hashes.json");
const LOG_PATH_DEFAULT = path.join(LOGS_ROOT, "translateGeneralRecalls10Lang.run-log.json");

const OPENAI_TIMEOUT_MS = 60000;
const OPENAI_MAX_RETRIES = 4;
const RATE_LIMIT_MS = 50;
const CHUNK_MAX_LEN = 900;

const LANGUAGES = [
  { code: "zh", name: "Chinese (Simplified)", dir: "ltr" },
  { code: "es", name: "Spanish", dir: "ltr" },
  { code: "ar", name: "Arabic", dir: "rtl" },
  { code: "hi", name: "Hindi", dir: "ltr" },
  { code: "pt", name: "Portuguese (Brazil)", dir: "ltr" },
  { code: "ru", name: "Russian", dir: "ltr" },
  { code: "fr", name: "French", dir: "ltr" },
  { code: "ja", name: "Japanese", dir: "ltr" },
  { code: "de", name: "German", dir: "ltr" },
  { code: "vi", name: "Vietnamese", dir: "ltr" },
];

// Global state so we can flush progress on Ctrl+C / termination.
let ACTIVE_STATE = null;

function persistActiveStateSafe() {
  if (!ACTIVE_STATE) return;
  const { args, inputList, outputBySlug, hashes, runLog } = ACTIVE_STATE;
  try {
    const merged = inputList.map((r) => outputBySlug.get(r.slug) || r);
    writeJsonArray(args.output, merged);
    writeHashes(args.hashFile, hashes);
    flushRunLog(args.logFile, runLog);
  } catch {}
}

/* process.on("SIGINT", () => {
  console.log("\nInterrupted — flushing progress to disk...");
  persistActiveStateSafe();
  process.exit(0);
}); */

/* process.on("SIGTERM", () => {
  console.log("\nTerminated — flushing progress to disk...");
  persistActiveStateSafe();
  process.exit(0);
}); */

process.on("SIGINT", () => {
  console.log("\nInterrupted - flushing progress to disk...");
  persistActiveStateSafe();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nTerminated - flushing progress to disk...");
  persistActiveStateSafe();
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  try { console.error("Uncaught exception:", err && err.stack ? err.stack : err); } catch {}
  persistActiveStateSafe();
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  try { console.error("Unhandled rejection:", err); } catch {}
  persistActiveStateSafe();
  process.exit(1);
});

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

function fmtElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function progressBar(current, total, width = 26) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(current, safeTotal) / safeTotal;
  const filled = Math.round(ratio * width);
  return `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
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
    status: "simple", // simple | verbose
  };
  for (const flag of flags) {
    if (flag.startsWith("--input=")) out.input = path.resolve(flag.slice(8));
    if (flag.startsWith("--output=")) out.output = path.resolve(flag.slice(9));
    if (flag.startsWith("--hashfile=")) out.hashFile = path.resolve(flag.slice(11));
    if (flag.startsWith("--logfile=")) out.logFile = path.resolve(flag.slice(10));
    if (flag.startsWith("--slug=")) out.slug = flag.slice(7).trim();
    if (flag.startsWith("--limit=")) out.limit = Number(flag.slice(8));
    if (flag === "--verbose" || flag === "--status=verbose") out.status = "verbose";
    if (flag === "--simple" || flag === "--status=simple") out.status = "simple";
  }
  return out;
}

function readHashes(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) || {};
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
    return JSON.parse(fs.readFileSync(p, "utf8")) || null;
  } catch {
    return null;
  }
}

function flushRunLog(p, log) {
  ensureDir(path.dirname(p));
  log.finishedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(log, null, 2), "utf8");
}

function createRunLog() {
  return {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    successes: [],
    failures: [],
    summary: { recallsProcessed: 0, languagesSaved: 0, languagesSkipped: 0, failures: 0 },
  };
}

function scrubBadTranslationText(translated, source) {
  const t = String(translated || "").trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  const badMarkers = [
    "you are a professional translator",
    "return only the translated text",
    "please provide the text",
    "i don't see any text to translate",
    "sorry, but it seems",
  ];
  for (const m of badMarkers) {
    if (lower.includes(m)) return "";
  }
  // If the model echoed the prompt, the translated text tends to be much longer than source.
  // Keep this check loose so short fields like RemedyOptions are not falsely rejected.
  if (source && typeof source === "string") {
    const src = source.trim();
    if (src && src.length > 80 && t.length > src.length * 4) return "";
  }
  return t;
}

function splitTextIntoChunks(text) {
  const s = String(text || "");
  if (s.length <= CHUNK_MAX_LEN) return [s];
  const chunks = [];
  let start = 0;
  while (start < s.length) {
    let end = Math.min(s.length, start + CHUNK_MAX_LEN);
    // Try to split at whitespace.
    const slice = s.slice(start, end);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 300) end = start + lastSpace;
    chunks.push(s.slice(start, end));
    start = end;
  }
  return chunks;
}

async function translateText(text, langName) {
  if (!text || typeof text !== "string" || !text.trim()) return { ok: true, text };
  if (!OPENAI_API_KEY) return { ok: false, reason: "missing-openai-api-key" };

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
          input: [
            "You are a professional translator for a public safety recall website.",
            `Translate the following text into ${langName}.`,
            "Rules:",
            "- Return ONLY the translated text, nothing else.",
            "- Keep brand names, product names, numbers, and URLs exactly as they are.",
            "- Do not add explanations, notes, or disclaimers.",
            "- Never output placeholders or requests for missing input.",
            "- Maintain a formal, safety-oriented tone.",
            "",
            text,
          ].join("\n"),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const reason = `http-${res.status}`;
        if (attempt < OPENAI_MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
          await delay(1500 * attempt);
          continue;
        }
        return { ok: false, reason };
      }

      const data = await res.json();
      const out = (data.output_text || data.output?.[0]?.content?.[0]?.text || "").trim();
      return { ok: true, text: out };
    } catch (e) {
      clearTimeout(timer);
      const reason = e && typeof e.message === "string" ? e.message : String(e);
      if (attempt < OPENAI_MAX_RETRIES) {
        await delay(1500 * attempt);
        continue;
      }
      return { ok: false, reason: reason.includes("abort") ? "timeout" : reason };
    }
  }
  return { ok: false, reason: "unknown" };
}

async function translateTextChunked(source, langName) {
  const chunks = splitTextIntoChunks(source);
  const translatedChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    await delay(RATE_LIMIT_MS);
    const r = await translateText(chunks[i], langName);
    if (!r.ok) return r;
    const cleaned = scrubBadTranslationText(r.text, chunks[i]);
    if (!cleaned) return { ok: false, reason: "rejected-output" };
    translatedChunks.push(cleaned);
  }
  return { ok: true, text: translatedChunks.join("\n\n") };
}

async function translateTextChunkedWithProgress(source, langName, onChunk) {
  const chunks = splitTextIntoChunks(source);
  if (typeof onChunk !== "function" || chunks.length <= 1) {
    return translateTextChunked(source, langName);
  }

  const translatedChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    onChunk(i + 1, chunks.length);
    await delay(RATE_LIMIT_MS);
    const r = await translateText(chunks[i], langName);
    if (!r.ok) return r;
    const cleaned = scrubBadTranslationText(r.text, chunks[i]);
    if (!cleaned) return { ok: false, reason: "rejected-output" };
    translatedChunks.push(cleaned);
  }
  return { ok: true, text: translatedChunks.join("\n\n") };
}

function padRight(s, n) {
  const str = String(s || "");
  if (str.length >= n) return str;
  return str + " ".repeat(n - str.length);
}

function makeThrottledLogger(minIntervalMs = 2000) {
  let last = 0;
  let lastLine = "";
  return (line) => {
    const now = Date.now();
    if (now - last < minIntervalMs) return;
    if (line === lastLine) return;
    last = now;
    lastLine = line;
    console.log(line);
  };
}

function fmtLangLeft(left, total) {
  return `left ${left}/${total}`;
}

function buildEnglishSourceForHash(row) {
  const en = row?.languages?.en || {};
  // Hash only the English fields we translate from.
  return {
    Title: en.Title || row?.Title || "",
    metaDescription: en.metaDescription || row?.metaDescription || "",
    Description: en.Description || row?.Description || "",
    ConsumerContact: en.ConsumerContact || row?.ConsumerContact || "",
    SoldAtLabel: en.SoldAtLabel || row?.SoldAtLabel || "",
    Products: (en.Products || row?.Products || []).map((p) => ({ Name: p?.Name || "", NumberOfUnits: p?.NumberOfUnits || "" })),
    Injuries: (en.Injuries || row?.Injuries || []).map((i) => ({ Name: i?.Name || "" })),
    Retailers: (en.Retailers || row?.Retailers || []).map((r) => ({ Name: r?.Name || "" })),
    Hazards: (en.Hazards || row?.Hazards || []).map((h) => ({ Name: h?.Name || "" })),
    Remedies: (en.Remedies || row?.Remedies || []).map((r) => ({ Name: r?.Name || "" })),
    RemedyOptions: (en.RemedyOptions || row?.RemedyOptions || []).map((o) => ({ Option: o?.Option || "" })),
    ManufacturerCountries: (en.ManufacturerCountries || row?.ManufacturerCountries || []).map((c) => ({ Country: c?.Country || "" })),
    Importers: (en.Importers || row?.Importers || []).map((x) => ({ Name: x?.Name || "" })),
    Distributors: (en.Distributors || row?.Distributors || []).map((x) => ({ Name: x?.Name || "" })),
    Manufacturers: (en.Manufacturers || row?.Manufacturers || []).map((x) => ({ Name: x?.Name || "" })),
  };
}

function sha(obj) {
  const h = crypto.createHash("sha256");
  h.update(JSON.stringify(obj));
  return h.digest("hex");
}

function ensureLanguageObject(row, code, dir) {
  if (!row.languages || typeof row.languages !== "object") row.languages = {};
  if (!row.languages[code] || typeof row.languages[code] !== "object") {
    row.languages[code] = { dir, lang: code };
  } else {
    row.languages[code].dir = dir;
    row.languages[code].lang = code;
  }
  return row.languages[code];
}

function isLangComplete(langObj, expectedHash) {
  if (!langObj || typeof langObj !== "object") return false;
  if (langObj._sourceHash !== expectedHash) return false;
  return langObj._checkpoint && langObj._checkpoint.complete === true;
}

async function translateRowToLang(row, lang, expectedHash, runLog, onProgress) {
  const en = row.languages?.en || {};
  const src = {
    Title: en.Title || row.Title || "",
    metaDescription: en.metaDescription || row.metaDescription || "",
    Description: en.Description || row.Description || "",
    ConsumerContact: en.ConsumerContact || row.ConsumerContact || "",
    SoldAtLabel: en.SoldAtLabel || row.SoldAtLabel || "",
    Products: en.Products || row.Products || [],
    Injuries: en.Injuries || row.Injuries || [],
    Retailers: en.Retailers || row.Retailers || [],
    Hazards: en.Hazards || row.Hazards || [],
    Remedies: en.Remedies || row.Remedies || [],
    RemedyOptions: en.RemedyOptions || row.RemedyOptions || [],
    ManufacturerCountries: en.ManufacturerCountries || row.ManufacturerCountries || [],
    Importers: en.Importers || row.Importers || [],
    Distributors: en.Distributors || row.Distributors || [],
    Manufacturers: en.Manufacturers || row.Manufacturers || [],
  };

  const langObj = ensureLanguageObject(row, lang.code, lang.dir);
  langObj._checkpoint = langObj._checkpoint && typeof langObj._checkpoint === "object" ? langObj._checkpoint : { doneKeys: {} };
  if (!langObj._checkpoint.doneKeys || typeof langObj._checkpoint.doneKeys !== "object") {
    langObj._checkpoint.doneKeys = {};
  }

  // Build a concrete task list so we can show progress even for long OpenAI calls.
  const tasks = [];
  const pushIf = (taskKey, label, val) => {
    const v = String(val || "").trim();
    if (!v) return;
    tasks.push({ taskKey, label });
  };
  pushIf("Title", "Title", src.Title);
  pushIf("metaDescription", "metaDescription", src.metaDescription);
  pushIf("Description", "Description", src.Description);
  pushIf("ConsumerContact", "ConsumerContact", src.ConsumerContact);
  pushIf("SoldAtLabel", "SoldAtLabel", src.SoldAtLabel);

  const pushArr = (arrKey, arr, itemKey) => {
    if (!Array.isArray(arr) || arr.length === 0) return;
    for (let i = 0; i < arr.length; i++) {
      const v = String(arr[i]?.[itemKey] || "").trim();
      if (!v) continue;
      tasks.push({ taskKey: `${arrKey}.${i}.${itemKey}`, label: `${arrKey}[${i}].${itemKey}` });
    }
  };
  pushArr("Products", src.Products, "Name");
  pushArr("Injuries", src.Injuries, "Name");
  pushArr("Retailers", src.Retailers, "Name");
  pushArr("Hazards", src.Hazards, "Name");
  pushArr("Remedies", src.Remedies, "Name");
  pushArr("RemedyOptions", src.RemedyOptions, "Option");
  pushArr("ManufacturerCountries", src.ManufacturerCountries, "Country");
  pushArr("Importers", src.Importers, "Name");
  pushArr("Distributors", src.Distributors, "Name");
  pushArr("Manufacturers", src.Manufacturers, "Name");

  const totalTasks = tasks.length;
  let doneTasks = tasks.filter((t) => Boolean(langObj._checkpoint.doneKeys[t.taskKey])).length;
  const progressTick = (label) => {
    doneTasks = Math.min(totalTasks, doneTasks + 1);
    if (typeof onProgress === "function") onProgress(doneTasks, totalTasks, label);
  };
  if (typeof onProgress === "function") onProgress(doneTasks, totalTasks, tasks[doneTasks]?.label || "starting");

  async function t(key, sourceText, assignFn) {
    if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) return;
    if (langObj._checkpoint.doneKeys[key]) return;
    if (typeof onProgress === "function") onProgress(doneTasks, totalTasks, `${key} (translating...)`);
    const r = await translateTextChunkedWithProgress(sourceText, lang.name, (idx, total) => {
      if (typeof onProgress === "function") onProgress(doneTasks, totalTasks, `${key} chunk ${idx}/${total}`);
    });
    if (!r.ok) throw new Error(`${key}: ${r.reason}`);
    assignFn(r.text);
    langObj._checkpoint.doneKeys[key] = true;
    langObj._checkpoint.updatedAt = new Date().toISOString();
    progressTick(key);
  }

  await t("Title", src.Title, (v) => { langObj.Title = v; });
  await t("metaDescription", src.metaDescription, (v) => { langObj.metaDescription = v; });
  await t("Description", src.Description, (v) => { langObj.Description = v; });
  await t("ConsumerContact", src.ConsumerContact, (v) => { langObj.ConsumerContact = v; });
  await t("SoldAtLabel", src.SoldAtLabel, (v) => { langObj.SoldAtLabel = v; });

  // Arrays: translate Name/Option/Country strings item-by-item, checkpoint per index.
  async function tArr(arrKey, arr, itemKey, setter) {
    if (!Array.isArray(arr) || arr.length === 0) return;
    if (!Array.isArray(langObj[arrKey])) langObj[arrKey] = arr.map(() => ({}));
    for (let i = 0; i < arr.length; i++) {
      const srcVal = String(arr[i]?.[itemKey] || "").trim();
      if (!srcVal) continue;
      const ck = `${arrKey}.${i}.${itemKey}`;
      if (langObj._checkpoint.doneKeys[ck]) continue;
      const pretty = `${arrKey}[${i}].${itemKey}`;
      if (typeof onProgress === "function") onProgress(doneTasks, totalTasks, `${pretty} (translating...)`);
      const r = await translateTextChunkedWithProgress(srcVal, lang.name, (idx, total) => {
        if (typeof onProgress === "function") onProgress(doneTasks, totalTasks, `${pretty} chunk ${idx}/${total}`);
      });
      if (!r.ok) throw new Error(`${ck}: ${r.reason}`);
      setter(i, r.text);
      langObj._checkpoint.doneKeys[ck] = true;
      langObj._checkpoint.updatedAt = new Date().toISOString();
      progressTick(ck);
      await delay(RATE_LIMIT_MS);
    }
  }

  await tArr("Products", src.Products, "Name", (i, v) => { langObj.Products[i] = { ...(langObj.Products[i] || {}), Name: v, NumberOfUnits: src.Products[i]?.NumberOfUnits || "" }; });
  await tArr("Injuries", src.Injuries, "Name", (i, v) => { langObj.Injuries[i] = { ...(langObj.Injuries[i] || {}), Name: v }; });
  await tArr("Retailers", src.Retailers, "Name", (i, v) => { langObj.Retailers[i] = { ...(langObj.Retailers[i] || {}), Name: v }; });
  await tArr("Hazards", src.Hazards, "Name", (i, v) => { langObj.Hazards[i] = { ...(langObj.Hazards[i] || {}), Name: v }; });
  await tArr("Remedies", src.Remedies, "Name", (i, v) => { langObj.Remedies[i] = { ...(langObj.Remedies[i] || {}), Name: v }; });
  await tArr("RemedyOptions", src.RemedyOptions, "Option", (i, v) => { langObj.RemedyOptions[i] = { ...(langObj.RemedyOptions[i] || {}), Option: v }; });
  await tArr("ManufacturerCountries", src.ManufacturerCountries, "Country", (i, v) => { langObj.ManufacturerCountries[i] = { ...(langObj.ManufacturerCountries[i] || {}), Country: v }; });
  await tArr("Importers", src.Importers, "Name", (i, v) => { langObj.Importers[i] = { ...(langObj.Importers[i] || {}), Name: v }; });
  await tArr("Distributors", src.Distributors, "Name", (i, v) => { langObj.Distributors[i] = { ...(langObj.Distributors[i] || {}), Name: v }; });
  await tArr("Manufacturers", src.Manufacturers, "Name", (i, v) => { langObj.Manufacturers[i] = { ...(langObj.Manufacturers[i] || {}), Name: v }; });

  langObj._sourceHash = expectedHash;
  langObj._checkpoint.complete = true;
  langObj._checkpoint.updatedAt = new Date().toISOString();

  runLog.successes.push({ slug: row.slug, lang: lang.code, at: new Date().toISOString() });
  runLog.summary.languagesSaved += 1;
}

async function main() {
  const args = parseArgs();
  ensureDir(LOGS_ROOT);
  ensureDir(path.dirname(args.output));

  const inputList = readJsonArraySafe(args.input);
  const runLog = readRunLog(args.logFile) || createRunLog();
  const hashes = readHashes(args.hashFile);

  let rows = inputList;
  if (args.slug) rows = rows.filter((r) => (r.slug || "") === args.slug);
  if (args.limit && Number.isFinite(args.limit) && args.limit > 0) rows = rows.slice(0, Math.floor(args.limit));

  const outputExisting = args.resume ? readJsonArraySafe(args.output) : [];
  const outputBySlug = new Map(outputExisting.map((r) => [r.slug, r]));

  ACTIVE_STATE = { args, inputList, outputBySlug, hashes, runLog };

  console.log(`Input:  ${args.input}`);
  console.log(`Output: ${args.output}`);
  console.log(`Rows:   ${rows.length}`);
  console.log(`Langs:  ${LANGUAGES.map((l) => l.code).join(", ")}`);
  console.log(`Status: ${args.status}`);
  console.log("");

  const started = Date.now();
  let recallsDone = 0;

  for (const row0 of rows) {
    const slug = row0?.slug || "(missing-slug)";
    const row = outputBySlug.get(slug) || { ...row0 };
    if (!row.languages || typeof row.languages !== "object") row.languages = row0.languages ? { ...row0.languages } : {};

    // Ensure English exists.
    if (!row.languages.en) {
      row.languages.en = {
        Title: row.Title || "",
        metaDescription: row.metaDescription || "",
        Description: row.Description || "",
        ConsumerContact: row.ConsumerContact || "",
        SoldAtLabel: row.SoldAtLabel || "",
        Products: row.Products || [],
        Images: row.Images || [],
        Injuries: row.Injuries || [],
        Retailers: row.Retailers || [],
        Importers: row.Importers || [],
        Distributors: row.Distributors || [],
        Manufacturers: row.Manufacturers || [],
        ManufacturerCountries: row.ManufacturerCountries || [],
        Hazards: row.Hazards || [],
        Remedies: row.Remedies || [],
        RemedyOptions: row.RemedyOptions || [],
        dir: "ltr",
        lang: "en",
      };
    }

    const hashSource = buildEnglishSourceForHash(row);
    const expectedHash = sha(hashSource);

    console.log(`[${recallsDone + 1}/${rows.length}] ${slug}`);

    const pendingLangs = LANGUAGES.filter((lang) => {
      const existing = row.languages?.[lang.code];
      return !(args.resume && isLangComplete(existing, expectedHash));
    });
    const pendingSet = new Set(pendingLangs.map((l) => l.code));

    for (const lang of LANGUAGES) {
      const existing = row.languages?.[lang.code];
      if (args.resume && isLangComplete(existing, expectedHash)) {
        runLog.summary.languagesSkipped += 1;
        continue;
      }

      const langStart = Date.now();
      try {
        await delay(RATE_LIMIT_MS);

        const leftBefore = pendingSet.size;

        if (args.status === "verbose") {
          const logProgress = makeThrottledLogger(2500);
          console.log(`  -> ${lang.code} ${padRight(lang.name, 20)} starting...`);
          await translateRowToLang(row, lang, expectedHash, runLog, (done, total, label) => {
            const bar = progressBar(done, total, 20);
            logProgress(`     ${lang.code} [${bar}] ${String(done).padStart(3)}/${String(total).padEnd(3)}  ${label || ""}`);
          });
        } else {
          const heartbeat = makeThrottledLogger(15000);
          console.log(`  ${lang.code} | ${fmtLangLeft(leftBefore, LANGUAGES.length)} | start`);
          await translateRowToLang(row, lang, expectedHash, runLog, () => {
            heartbeat(`  ${lang.code} | ${fmtLangLeft(leftBefore, LANGUAGES.length)} | working (${fmtElapsed(Date.now() - langStart)})`);
          });
        }

        // Persist checkpoint after each language
        outputBySlug.set(slug, row);
        hashes[slug] = expectedHash;
        writeHashes(args.hashFile, hashes);
        const merged = inputList.map((r) => outputBySlug.get(r.slug) || r);
        writeJsonArray(args.output, merged);
        flushRunLog(args.logFile, runLog);

        pendingSet.delete(lang.code);
        const leftAfter = pendingSet.size;

        if (args.status === "verbose") {
          console.log(`  ok ${lang.code}  ${fmtElapsed(Date.now() - langStart)}`);
        } else {
          console.log(`  ${lang.code} | ${fmtLangLeft(leftAfter, LANGUAGES.length)} | ok (${fmtElapsed(Date.now() - langStart)})`);
        }
      } catch (e) {
        const reason = e && typeof e.message === "string" ? e.message : String(e);
        runLog.failures.push({ slug, lang: lang.code, reason, at: new Date().toISOString() });
        runLog.summary.failures += 1;
        flushRunLog(args.logFile, runLog);
        const leftAfter = pendingSet.size;
        if (args.status === "verbose") {
          console.log(`  fail ${lang.code}  ${reason}`);
        } else {
          console.log(`  ${lang.code} | ${fmtLangLeft(leftAfter, LANGUAGES.length)} | fail (${reason})`);
        }
        // Continue other languages/rows; resume will pick this up later.
      }
    }

    outputBySlug.set(slug, row);
    recallsDone++;
    runLog.summary.recallsProcessed = recallsDone;
    flushRunLog(args.logFile, runLog);

    const elapsed = Date.now() - started;
    console.log(`  saved recall  ${progressBar(recallsDone, rows.length)}  elapsed ${fmtElapsed(elapsed)}\n`);
  }

  flushRunLog(args.logFile, runLog);
  ACTIVE_STATE = null;
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
