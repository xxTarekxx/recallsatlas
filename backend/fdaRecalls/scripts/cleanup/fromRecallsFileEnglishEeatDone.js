"use strict";

/**
 * fromRecallsFileEnglishEeatDone.js
 *
 * English-only E-E-A-T + SEO pass on FDA recalls from recalls.json.
 * Does not modify recalls.json.
 *
 * Output file contains ONLY recalls that have been processed by this script
 * (not a full copy of recalls.json). Grows as you run; skip when hash matches.
 *
 * Defaults:
 *   Input:  backend/fdaRecalls/data/recalls.json
 *   Output: backend/fdaRecalls/data/fromRecallsFile-english-only-EEAT-DONE.json
 *   Hashes: backend/fdaRecalls/data/logs/fromRecallsFileEnglishEeatDone.hashes.json
 *   Log:    backend/fdaRecalls/data/logs/fromRecallsFileEnglishEeatDone.run-log.json
 *
 * Env:
 *   OPENAI_API_KEY (required)
 *   OPENAI_EEAT_FROM_RECALLS_MODEL (optional, default gpt-4.1)
 *
 * Usage (from repo root):
 *   node backend/fdaRecalls/scripts/cleanup/fromRecallsFileEnglishEeatDone.js
 *
 * Skips unchanged rows automatically (hash file). No --resume / --pending flags.
 *
 *   node ... --test     # one recall: first in file that still needs a run
 *   node ... --limit=3  # first N rows of input (unchanged = skipped; not added to output)
 *   node ... --slug=... # one slug
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
const MODEL = process.env.OPENAI_EEAT_FROM_RECALLS_MODEL || "gpt-4.1";
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

/** Each saved recall: these root keys are overwritten. `languages` is replaced (English-only `en`). */
const MODIFIED_ROOT_KEYS = [
  "title",
  "headline",
  "description",
  "keywords",
  "content",
  "languages",
];
/** Set on `languages.en` (OpenAI rewrites the text fields; facts flow from the saved root recall). */
const MODIFIED_LANGUAGES_EN_KEYS = [
  "title",
  "headline",
  "description",
  "productDescription",
  "productType",
  "reason",
  "disclaimer",
  "pageTypeLabel",
  "label",
  "regulatedProducts",
  "content",
  "dir",
  "flag",
  "lang",
];

function progressBar(current, total, width = 30) {
  const safe = total > 0 ? total : 1;
  const ratio = Math.min(Math.max(current, 0), safe) / safe;
  const filled = Math.round(ratio * width);
  const pct = Math.round(ratio * 100);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}  ${String(pct).padStart(3)}%`;
}

function recallPosLabel(recall, fullList, slug) {
  if (recall && recall.sortOrder != null && String(recall.sortOrder).length) {
    return `sortOrder=${recall.sortOrder}`;
  }
  const n = fullList.findIndex((r) => (r.slug || r.id) === slug) + 1;
  return n > 0 ? `row ${n}/${fullList.length}` : "row ?";
}

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

/** Persist only processed recalls, newest sortOrder first (matches typical recalls.json order). */
function flushProcessedOutput(outputBySlug) {
  const arr = Array.from(outputBySlug.values());
  arr.sort((a, b) => (Number(b.sortOrder) || 0) - (Number(a.sortOrder) || 0));
  return arr;
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

/** Curly quotes / typographic apostrophe → ASCII (fewer editor/JSON UI issues). */
function normalizeEditorSafeText(value) {
  if (value == null || typeof value !== "string") return value;
  return value
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"');
}

/** Zero-width / BOM / soft hyphen — often trigger bad perf in editors on huge JSON strings. */
function sanitizeStringForStableFile(value) {
  if (value == null || typeof value !== "string") return value;
  return normalizeEditorSafeText(value).replace(/\u200b|\u200c|\u200d|\u2060|\ufeff|\u00ad/g, "");
}

/** Apply sanitizeStringForStableFile to every string leaf before writing output JSON. */
function deepSanitizeForEditorOutput(value) {
  if (value == null) return value;
  if (typeof value === "string") return sanitizeStringForStableFile(value);
  if (Array.isArray(value)) return value.map(deepSanitizeForEditorOutput);
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = deepSanitizeForEditorOutput(value[k]);
    }
    return out;
  }
  return value;
}

function processedArrayForWrite(outputBySlug) {
  return flushProcessedOutput(outputBySlug).map((r) => deepSanitizeForEditorOutput(r));
}

function cleanText(value) {
  return normalizeEditorSafeText(normalizeWhitespace(value));
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
    recallSummaryHtml:
      normalizeEditorSafeText(String(model.recallSummaryHtml || fallback.recallSummaryHtml || "").trim()) ||
      fallback.recallSummaryHtml,
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
    flag: "US",
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
  const existingOut = readJsonArray(args.output);
  const outputBySlug = new Map(existingOut.map((r) => [r.slug || r.id, r]));
  const hashes = readJsonObject(args.hashFile);

  const canSkip = (recall) => canSkipByHash(recall, outputBySlug, hashes);

  let workList;
  if (args.slug) {
    workList = fullList.filter((r) => (r.slug || r.id) === args.slug);
  } else if (args.test) {
    const firstNeed = fullList.find((r) => !canSkipByHash(r, outputBySlug, hashes));
    if (!firstNeed) {
      console.log(
        "\n" +
          C.green +
          "Test: every recall in the input is already in the output with a matching hash." +
          C.reset +
          "\n  Nothing to run. Remove a hash for a slug or delete the output to force a re-run."
      );
      process.exit(0);
    }
    workList = [firstNeed];
  } else if (Number.isFinite(args.limit) && args.limit > 0) {
    workList = fullList.slice(0, Math.floor(args.limit));
  } else {
    workList = fullList;
  }

  const toProcess = workList.filter((r) => !canSkip(r));
  const workTotal = toProcess.length;
  const willSkip = workList.length - workTotal;
  let workIndex = 0;

  const runLog = {
    startedAt: new Date().toISOString(),
    successes: [],
    failures: [],
    summary: {},
    outputMode: "processed-only",
  };
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  const t0 = Date.now();

  console.log(`\n${C.cyan}fromRecallsFile → English E-E-A-T${C.reset}`);
  console.log(`  input:  ${args.input}`);
  console.log(`  output: ${args.output}  ${C.dim}(only processed recalls; not a full mirror of input)${C.reset}`);
  console.log(`  model:  ${MODEL}`);
  console.log(`  already in output file: ${existingOut.length} recall(s)`);
  if (args.test) {
    console.log(`  ${C.yellow}--test${C.reset}  (single recall: first in file that still needs a run)`);
  }
  console.log(
    `  scope:  ${workList.length} row(s) in this run (of ${fullList.length} in file)  |  ` +
      `${C.green}${workTotal} to process${C.reset}  |  ${C.dim}${willSkip} skip (unchanged)${C.reset}`
  );
  if (workTotal === 0) {
    console.log(`\n${C.green}Up to date.${C.reset} Nothing to do for this run.\n`);
  }
  console.log(`${C.dim}Each processed recall updates these root keys: ${MODIFIED_ROOT_KEYS.join(", ")}${C.reset}`);
  console.log(
    `${C.dim}languages.en keys set: ${MODIFIED_LANGUAGES_EN_KEYS.join(", ")}${C.reset}\n`
  );

  for (const recall of workList) {
    const slug = recall.slug || recall.id;
    if (canSkip(recall)) {
      skipped++;
      continue;
    }
    workIndex += 1;
    const pos = recallPosLabel(recall, fullList, slug);
    const shortSlug = slug.length > 72 ? `${slug.slice(0, 70)}…` : slug;
    console.log(
      `\n  ${C.bold}── ${workIndex} / ${workTotal}  (${pos})${C.reset}\n  ${C.dim}${shortSlug}${C.reset}`
    );

    await delay(RATE_LIMIT_MS);
    try {
      const updated = await processOne(recall);
      const h = buildSourceHash(recall);
      hashes[slug] = h;
      outputBySlug.set(slug, updated);
      writeJson(args.hashFile, hashes);
      writeJson(args.output, processedArrayForWrite(outputBySlug));
      saved++;
      console.log(
        `  ${C.green}saved${C.reset}  [${progressBar(workIndex, workTotal)}]  ${C.dim}keys: ${MODIFIED_ROOT_KEYS.join(", ")}${C.reset}`
      );
    } catch (e) {
      failed++;
      runLog.failures.push({ slug, error: e.message || String(e) });
      console.log(
        `  ${C.red}fail${C.reset}  [${progressBar(workIndex, workTotal)}]  ${e.message || e}`
      );
    }
  }

  runLog.finishedAt = new Date().toISOString();
  runLog.summary = { saved, skipped, failed, elapsed: fmtElapsed(Date.now() - t0) };
  writeJson(args.logFile, runLog);
  console.log(
    `\nDone. saved=${saved}  skipped(unchanged)=${skipped}  failed=${failed}  time=${runLog.summary.elapsed}` +
      (workTotal > 0 ? `  [${progressBar(workTotal, workTotal)}] of run` : "")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
