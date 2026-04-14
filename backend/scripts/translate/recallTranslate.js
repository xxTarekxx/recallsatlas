"use strict";

/**
 * recallTranslate.js
 *
 * Translates recall documents in MongoDB into 19 languages.
 * Translations are stored inside each recall document under:
 *   recall.languages.en  ← original English (built from existing fields)
 *   recall.languages.es  ← Spanish translation
 *   recall.languages.ar  ← Arabic translation (dir: rtl)
 *   ... etc.
 *
 * Each language entry is saved to MongoDB as soon as it finishes —
 * so the script is fully resume-safe if interrupted.
 *
 * Local mirror: recalls.json (same folder) is rewritten from Mongo — full documents including
 * languages.*, sorted by sortOrder descending (newest first).
 *
 * Usage (from backend/):
 *   node scripts/translate/recallTranslate.js                  # translate all untranslated recalls
 *   node scripts/translate/recallTranslate.js --dry-run        # preview only, no writes
 *   node scripts/translate/recallTranslate.js --slug=some-slug # translate a single recall by slug
 *   node scripts/translate/recallTranslate.js --reset          # clear all translations (re-translate everything)
 *
 * Env: OPENAI_API_KEY, MONGODB_URI — backend/scripts/.env or backend/.env
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const SCRIPTS_ROOT = path.join(__dirname, "..");
const BACKEND_ROOT = path.join(SCRIPTS_ROOT, "..");

// ─── Env ──────────────────────────────────────────────────────────────────────

require("dotenv").config({
  path: fs.existsSync(path.join(SCRIPTS_ROOT, ".env"))
    ? path.join(SCRIPTS_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error("Missing OPENAI_API_KEY"); process.exit(1); }

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL = "gpt-4.1-mini";
const RATE_LIMIT_MS = 30;   // ms between OpenAI calls

const flags = process.argv.slice(2).filter(a => a.startsWith("--"));
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const DRY_RUN = flags.includes("--dry-run");
const RESET = flags.includes("--reset");
const RESUME_PARTIAL = flags.includes("--resume-partial");
const MONGO_MODE = flags.includes("--mongo");
const ONE = flags.includes("--one");
const LIMIT_ARG = Number((flags.find(f => f.startsWith("--limit=")) || "").split("=")[1]);
const SLUG_ARG = flags.find(f => f.startsWith("--slug="))?.split("=")[1]
  || (args[0] && !args[0].startsWith("--") ? args[0] : null);
const OUTPUT_ARG = flags.find(f => f.startsWith("--output="))?.split("=")[1] || null;
const LIMIT = ONE ? 1 : (Number.isFinite(LIMIT_ARG) && LIMIT_ARG > 0 ? Math.floor(LIMIT_ARG) : null);
const RECALLS_JSON_PATH = path.join(SCRIPTS_ROOT, "recalls.json");
const OUTPUT_JSON_PATH = OUTPUT_ARG
  ? path.resolve(BACKEND_ROOT, OUTPUT_ARG)
  : null;
const RUN_LOG_PATH = path.join(__dirname, "recallTranslate.run-log.json");
let ACTIVE_RUN_LOG = null;
const HEADLINE_CACHE = new Map();

// ─── Languages ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "zh", name: "Chinese (Simplified)", flag: "🇨🇳", dir: "ltr" },
  { code: "es", name: "Spanish", flag: "🇪🇸", dir: "ltr" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", dir: "rtl" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", dir: "ltr" },
  { code: "pt", name: "Portuguese (Brazil)", flag: "🇧🇷", dir: "ltr" },
  { code: "ru", name: "Russian", flag: "🇷🇺", dir: "ltr" },
  { code: "fr", name: "French", flag: "🇫🇷", dir: "ltr" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", dir: "ltr" },
  { code: "de", name: "German", flag: "🇩🇪", dir: "ltr" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳", dir: "ltr" },
];

const TARGET_LANGS = LANGUAGES.filter(l => l.code !== "en");

const PRODUCT_TYPE_TRANSLATIONS = {
  Cosmetics: {
    zh: "化妆品",
    es: "Cosméticos",
    ar: "مستحضرات التجميل",
    hi: "प्रसाधन सामग्री",
    pt: "Cosméticos",
    ru: "Косметика",
    fr: "Cosmétiques",
    ja: "化粧品",
    de: "Kosmetika",
    vi: "Mỹ phẩm",
  },
};

const BAD_TRANSLATION_PATTERNS = [
  /you are (?:a|an) professional translator/i,
  /translate the following text/i,
  /return only the translated text/i,
  /please provide the text/i,
  /please send the text/i,
  /lo siento[,!]? no veo ning[uú]n texto/i,
  /claro[,!]? por favor proporciona el texto/i,
  /vous [êe]tes un traducteur professionnel/i,
  /sie sind (?:ein )?professionell(?:er)? [üu]bersetzer/i,
  /você é um tradutor profissional/i,
  /вы профессиональный переводчик/i,
  /أنت مترجم محترف/i,
  /आप एक .*अनुवादक/i,
  /あなたは.*翻訳者/i,
  /您是.*翻译员/i,
  /bạn là .*dịch/i,
];

const BAD_TRANSLATION_SNIPPETS = [
  "FDA recall pagehere",
  "FDA recall page here",
  "company websitehere",
  "company website here",
  "please provide the text",
  "please send the text",
];

// ─── Terminal colours ─────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

// ─── Terminal UI helpers ──────────────────────────────────────────────────────

function uiHeader(title) {
  const w = 58;
  const line = "═".repeat(w);
  console.log(`\n${C.cyan}${C.bold}  ${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${line}${C.reset}\n`);
}

function uiDivider() {
  console.log(`  ${C.dim}${"─".repeat(58)}${C.reset}`);
}

function uiPhase(label) {
  console.log(`\n  ${C.cyan}▸${C.reset} ${label}`);
}

function uiOk(msg) {
  console.log(`  ${C.green}✓${C.reset} ${msg}`);
}

function uiWarn(msg) {
  console.log(`  ${C.yellow}⚠${C.reset} ${msg}`);
}

function uiInfo(label, value) {
  const lPad = label.padEnd(22);
  console.log(`     ${C.dim}${lPad}${C.reset}${value}`);
}

function progressBar(current, total, width = 26) {
  if (total <= 0) total = 1;
  const ratio = Math.min(current, total) / total;
  const filled = Math.round(ratio * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pct = String(Math.round(ratio * 100)).padStart(3);
  return `[${bar}] ${pct}%`;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function fmtElapsed(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function fmtEta(avgMs, remaining) {
  if (remaining <= 0 || avgMs <= 0) return "—";
  return fmtElapsed(avgMs * remaining);
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function translateText(text, langName) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { ok: true, text, reason: "empty-source" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          `You are a professional translator for a public safety recall website.`,
          `Translate the following text into ${langName}.`,
          `Rules:`,
          `- Return ONLY the translated text, nothing else.`,
          `- Keep all HTML tags, href URLs, brand names, product names, and numbers exactly as they are.`,
          `- Do not add explanations, notes, or disclaimers.`,
          `- Do not translate proper nouns like company names, product model numbers, or FDA/NHTSA.`,
          `- Never output placeholders, filler text, or requests for missing input.`,
          `- This content is for FDA or consumer product recalls. Do not mention NHTSA, vehicle safety, driving, or unrelated product domains unless the source text explicitly does so.`,
          `- Preserve a formal, safety-oriented tone and keep safety facts accurate, including whether injuries were or were not reported.`,
          `- Keep all HTML <a> tags intact, but localize the visible anchor text naturally for ${langName}.`,
          ``,
          text,
        ].join("\n"),
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, text: null, reason: `http-${res.status}` };
    }

    const data = await res.json();
    const translated = (
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      ""
    ).trim();

    if (!translated) {
      return { ok: false, text: null, reason: "empty-response" };
    }

    if (isBadTranslationOutput(translated, text)) {
      return { ok: false, text: null, reason: "rejected-output" };
    }

    return { ok: true, text: translated, reason: "translated" };

  } catch (error) {
    clearTimeout(timer);
    return {
      ok: false,
      text: null,
      reason: error?.name === "AbortError" ? "timeout" : "network-or-parse",
    };
  }
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isBadTranslationOutput(output, sourceText = "") {
  const text = normalizeWhitespace(output);
  if (!text) return true;

  for (const pattern of BAD_TRANSLATION_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  const lowered = text.toLowerCase();
  for (const snippet of BAD_TRANSLATION_SNIPPETS) {
    if (lowered.includes(snippet.toLowerCase())) return true;
  }

  if (/^(sure|claro|here|aquí|aqui|ici|hier|здесь|यहाँ|这里|こちら|đây)\b/i.test(text)) {
    return true;
  }

  const src = normalizeWhitespace(sourceText);
  if (src && text.length > src.length * 2.5 && /translator|traduct|übersetz|перевод|مترجم|अनुवाद|翻译|dịch/i.test(text)) {
    return true;
  }

  return false;
}

function scrubBadTranslationText(value, fallback = "") {
  if (typeof value !== "string") return value;
  const cleaned = value
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk && !isBadTranslationOutput(chunk, fallback))
    .join("\n\n")
    .trim();
  return cleaned || fallback || value;
}

function sanitizeTranslatedSection(section, sourceSection) {
  if (!section || typeof section !== "object") return section;
  const out = { ...section };
  if (typeof out.subtitle === "string") {
    out.subtitle = scrubBadTranslationText(out.subtitle, sourceSection?.subtitle || "");
  }
  if (typeof out.text === "string") {
    out.text = scrubBadTranslationText(out.text, sourceSection?.text || "");
  }
  if (Array.isArray(out.authorityLinks)) {
    out.authorityLinks = out.authorityLinks.map((link, idx) =>
      scrubBadTranslationText(link, Array.isArray(sourceSection?.authorityLinks) ? sourceSection.authorityLinks[idx] || "" : "")
    );
  }
  if (out.facts && typeof out.facts === "object") {
    for (const key of Object.keys(out.facts)) {
      out.facts[key] = scrubBadTranslationText(
        out.facts[key],
        sourceSection?.facts && typeof sourceSection.facts === "object" ? sourceSection.facts[key] || "" : ""
      );
    }
  }
  return out;
}

function sanitizeTranslatedLanguage(result, source) {
  if (!result || typeof result !== "object") return result;
  const out = { ...result };
  const topFields = [
    "title", "headline", "description", "productDescription", "productType",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
  ];
  for (const key of topFields) {
    if (typeof out[key] === "string") {
      out[key] = scrubBadTranslationText(out[key], source?.[key] || "");
    }
  }
  if (Array.isArray(out.content)) {
    out.content = out.content.map((section, idx) =>
      sanitizeTranslatedSection(section, Array.isArray(source?.content) ? source.content[idx] || {} : {})
    );
  }
  return out;
}

function deriveHeadline(recall) {
  const current = String(recall?.headline || "").trim();
  if (current && current.toLowerCase() !== "product recall") return current;

  const title = String(recall?.title || "").trim();
  if (title && title.toLowerCase() !== "product recall") return title;

  const brand = String(recall?.brandName || recall?.companyName || "").trim();
  const product = String(recall?.productDescription || "Product").trim();
  const reason = String(recall?.reason || "a safety concern").trim();

  if (brand) {
    return `Recall: ${product} by ${brand} due to ${reason}`;
  }
  return `Recall: ${product} due to ${reason}`;
}

function isWeakHeadline(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  return [
    "product recall",
    "recall notice",
    "voluntary recall",
    "company announcement",
  ].includes(lower);
}

async function optimizeEnglishHeadline(recall) {
  const cacheKey = String(recall?.slug || recall?.id || crypto.randomUUID());
  if (HEADLINE_CACHE.has(cacheKey)) return HEADLINE_CACHE.get(cacheKey);

  const current = String(recall?.headline || "").trim();
  const fallback = deriveHeadline(recall);

  if (!isWeakHeadline(current)) {
    HEADLINE_CACHE.set(cacheKey, current);
    return current;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          "You write concise English headlines for FDA and consumer product recall pages.",
          "Return only one headline line, with no quotes or markdown.",
          "Use a factual, safety-oriented tone.",
          "Avoid generic headlines like 'Product Recall'.",
          "Keep it descriptive and SEO-friendly without sounding spammy.",
          "Do not invent facts, injuries, retailers, or hazards not present in the source.",
          "Prefer this shape when supported: '[Brand] Recalls [Product] Over [Hazard]'.",
          "",
          `Current headline: ${current || "(empty)"}`,
          `Title: ${recall?.title || ""}`,
          `Company: ${recall?.companyName || ""}`,
          `Brand: ${recall?.brandName || ""}`,
          `Product: ${recall?.productDescription || ""}`,
          `Product type: ${recall?.productType || ""}`,
          `Reason: ${recall?.reason || ""}`,
          `Fallback headline: ${fallback}`,
        ].join("\n"),
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) {
      HEADLINE_CACHE.set(cacheKey, fallback);
      return fallback;
    }

    const data = await res.json();
    const optimized = normalizeWhitespace(
      data.output?.[0]?.content?.[0]?.text || data.output_text || ""
    ).replace(/^["']|["']$/g, "");

    if (!optimized || isWeakHeadline(optimized) || optimized.length > 180) {
      HEADLINE_CACHE.set(cacheKey, fallback);
      return fallback;
    }

    HEADLINE_CACHE.set(cacheKey, optimized);
    return optimized;
  } catch {
    clearTimeout(timer);
    HEADLINE_CACHE.set(cacheKey, fallback);
    return fallback;
  }
}

async function translateAuthorityLink(html, langName) {
  if (!html || typeof html !== "string") return html;

  const parts = [];
  let cursor = 0;
  const tagRe = /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/gi;
  let match;

  while ((match = tagRe.exec(html)) !== null) {
    if (match.index > cursor) {
      const plainSegment = html.slice(cursor, match.index);
      parts.push(
        translateText(plainSegment, langName).then((result) =>
          result.ok ? result.text : plainSegment
        )
      );
    }
    const [, openTag, innerText, closeTag] = match;
    parts.push(
      translateText(innerText, langName).then((result) =>
        result.ok ? `${openTag}${result.text}${closeTag}` : `${openTag}${innerText}${closeTag}`
      )
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < html.length) {
    const trailingSegment = html.slice(cursor);
    parts.push(
      translateText(trailingSegment, langName).then((result) =>
        result.ok ? result.text : trailingSegment
      )
    );
  }
  if (parts.length === 0) {
    const result = await translateText(html, langName);
    return result.ok ? result.text : html;
  }

  const joined = (await Promise.all(parts)).join("");
  return isBadTranslationOutput(joined, html) ? html : joined;
}

// ─── Build English source ─────────────────────────────────────────────────────

function buildEnglishSource(recall, headlineOverride) {
  const content = (Array.isArray(recall.content) ? recall.content : [])
    .filter((section) => String(section?.subtitle || "").toLowerCase() !== "what was recalled")
    .map(section => {
      const s = {};
      if (section.subtitle) s.subtitle = section.subtitle;
      if (section.text) s.text = section.text;
      if (Array.isArray(section.authorityLinks) && section.authorityLinks.length) {
        s.authorityLinks = section.authorityLinks;
      }
      if (section.facts && typeof section.facts === "object") {
        s.facts = { ...section.facts };
      }
      return s;
    });

  return {
    title: recall.title || "",
    headline: headlineOverride || deriveHeadline(recall),
    description: recall.description || "",
    productDescription: recall.productDescription || "",
    productType: recall.productType || "",
    reason: recall.reason || "",
    disclaimer: recall.disclaimer || "",
    pageTypeLabel: recall.pageTypeLabel || "",
    label: recall.label || "",
    regulatedProducts: typeof recall.regulatedProducts === "string"
      ? recall.regulatedProducts
      : (Array.isArray(recall.regulatedProducts)
        ? recall.regulatedProducts.join(", ")
        : ""),
    content,
  };
}

// ─── Count translatable elements ──────────────────────────────────────────────

function countElements(source) {
  const topFields = [
    "title", "headline", "description", "productDescription", "productType",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
  ];
  let n = topFields.filter(k => source[k]).length;
  for (const section of source.content || []) {
    if (section.subtitle) n++;
    if (section.text) n++;
    if (Array.isArray(section.authorityLinks)) n += section.authorityLinks.length;
    if (section.facts) {
      n += Object.values(section.facts).filter(v => typeof v === "string" && v).length;
    }
  }
  return n;
}

function splitTextIntoChunks(text, maxLen = 1800) {
  const normalized = String(text || "").trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLen) {
      if (current) pushCurrent();
      const sentences = paragraph.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
      let sentenceChunk = "";
      for (const sentence of sentences) {
        const candidate = sentenceChunk ? `${sentenceChunk} ${sentence}` : sentence;
        if (candidate.length > maxLen) {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
            sentenceChunk = sentence;
          } else {
            for (let i = 0; i < sentence.length; i += maxLen) {
              chunks.push(sentence.slice(i, i + maxLen));
            }
            sentenceChunk = "";
          }
        } else {
          sentenceChunk = candidate;
        }
      }
      if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLen) {
      pushCurrent();
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return chunks;
}

// ─── Translate one language ───────────────────────────────────────────────────

async function translateLangObject(source, langName, langCode, existingLang, onProgress, onCheckpoint, runLog, slug) {
  // Start from source shape, then overlay any previously saved in-progress translations.
  const result = JSON.parse(JSON.stringify(source));
  const prior = existingLang && typeof existingLang === "object" ? existingLang : null;
  if (prior) {
    for (const key of Object.keys(result)) {
      if (prior[key] !== undefined) result[key] = prior[key];
    }
  }

  const doneSet = new Set(Array.isArray(prior?._checkpoint?.doneKeys) ? prior._checkpoint.doneKeys : []);
  let done = 0;
  const doneCounted = new Set();

  const markDone = (taskKey) => {
    if (!doneCounted.has(taskKey)) {
      doneCounted.add(taskKey);
      onProgress(++done);
    }
  };

  const checkpoint = async () => {
    result._checkpoint = {
      doneKeys: Array.from(doneSet),
      updatedAt: new Date().toISOString(),
      complete: false,
    };
    if (onCheckpoint) await onCheckpoint(result);
  };

  async function t(taskKey, sourceText, assign) {
    if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) return;
    if (doneSet.has(taskKey)) {
      markDone(taskKey);
      return;
    }
    await delay(RATE_LIMIT_MS);
    const result = await translateText(sourceText, langName);
    if (!result.ok) {
      runLog.failures.push({
        slug,
        lang: langCode,
        taskKey,
        reason: result.reason,
      });
      throw new Error(`Translation failed for ${langCode} ${taskKey}: ${result.reason}`);
    }
    assign(result.text);
    runLog.successes.push({
      slug,
      lang: langCode,
      taskKey,
    });
    doneSet.add(taskKey);
    markDone(taskKey);
    await checkpoint();
  }

  async function tChunked(taskKey, sourceText, assign) {
    if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) return;
    if (doneSet.has(taskKey)) {
      markDone(taskKey);
      return;
    }

    const chunks = splitTextIntoChunks(sourceText);
    const translatedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      await delay(RATE_LIMIT_MS);
      const result = await translateText(chunks[i], langName);
      if (!result.ok) {
        runLog.failures.push({
          slug,
          lang: langCode,
          taskKey: `${taskKey}:chunk:${i}`,
          reason: result.reason,
        });
        throw new Error(`Translation failed for ${langCode} ${taskKey}:chunk:${i}: ${result.reason}`);
      }
      translatedChunks.push(result.text);
      runLog.successes.push({
        slug,
        lang: langCode,
        taskKey: `${taskKey}:chunk:${i}`,
      });
    }

    assign(translatedChunks.join("\n\n"));
    doneSet.add(taskKey);
    markDone(taskKey);
    await checkpoint();
  }

  const topFields = [
    "title", "headline", "description", "productDescription", "productType",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
  ];
  for (const key of topFields) {
    if (key === "productType" && typeof source[key] === "string" && source[key].trim()) {
      const mapped = PRODUCT_TYPE_TRANSLATIONS[source[key]]?.[langCode];
      if (mapped) {
        result[key] = mapped;
        doneSet.add(`top:${key}`);
        markDone(`top:${key}`);
        await checkpoint();
        continue;
      }
    }
    await t(`top:${key}`, source[key], (v) => { result[key] = v; });
  }

  const sourceContent = Array.isArray(source.content) ? source.content : [];
  if (!Array.isArray(result.content)) result.content = [];

  for (let sIdx = 0; sIdx < sourceContent.length; sIdx++) {
    const srcSection = sourceContent[sIdx] || {};
    const outSection = result.content[sIdx] || {};
    result.content[sIdx] = outSection;

    await t(`section:${sIdx}:subtitle`, srcSection.subtitle, (v) => { outSection.subtitle = v; });
    await tChunked(`section:${sIdx}:text`, srcSection.text, (v) => { outSection.text = v; });

    const srcLinks = Array.isArray(srcSection.authorityLinks) ? srcSection.authorityLinks : [];
    if (!Array.isArray(outSection.authorityLinks)) outSection.authorityLinks = [...srcLinks];
    for (let i = 0; i < srcLinks.length; i++) {
      const taskKey = `section:${sIdx}:authority:${i}`;
      if (doneSet.has(taskKey)) {
        markDone(taskKey);
        continue;
      }
      await delay(RATE_LIMIT_MS);
      outSection.authorityLinks[i] = await translateAuthorityLink(srcLinks[i], langName);
      runLog.successes.push({
        slug,
        lang: langCode,
        taskKey,
      });
      doneSet.add(taskKey);
      markDone(taskKey);
      await checkpoint();
    }

    const srcFacts = srcSection.facts && typeof srcSection.facts === "object" ? srcSection.facts : null;
    if (srcFacts) {
      if (!outSection.facts || typeof outSection.facts !== "object") outSection.facts = { ...srcFacts };
      for (const fKey of Object.keys(srcFacts)) {
        await t(`section:${sIdx}:facts:${fKey}`, srcFacts[fKey], (v) => { outSection.facts[fKey] = v; });
      }
    }
  }

  delete result._checkpoint;
  return result;
}

// ─── Delay ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function readJsonArraySafe(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const v = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, arr) {
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), "utf8");
}

function upsertRecallInFile(filePath, recallDoc) {
  if (!filePath || !recallDoc || !recallDoc.slug) return false;
  const arr = readJsonArraySafe(filePath);
  const idx = arr.findIndex((r) => (r.slug || r.id) === recallDoc.slug);
  if (idx >= 0) arr[idx] = recallDoc;
  else arr.push(recallDoc);
  arr.sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  writeJsonArray(filePath, arr);
  return true;
}

function mergeExistingOutputRecalls(sourceRecalls, outputFilePath) {
  if (!outputFilePath || !fs.existsSync(outputFilePath)) return sourceRecalls;
  const existing = readJsonArraySafe(outputFilePath);
  if (!existing.length) return sourceRecalls;
  const bySlug = new Map(existing.map((recall) => [recall.slug || recall.id, recall]));
  return sourceRecalls.map((recall) => {
    const match = bySlug.get(recall.slug || recall.id);
    if (!match) return recall;
    return {
      ...recall,
      languages: match.languages || recall.languages,
      translatedAt: match.translatedAt || recall.translatedAt,
    };
  });
}

function sourceHash(source) {
  return crypto.createHash("sha256").update(JSON.stringify(source || {})).digest("hex");
}

function hasMeaningfulLanguageContent(langObj) {
  if (!langObj || typeof langObj !== "object") return false;
  if (typeof langObj.title === "string" && langObj.title.trim()) return true;
  if (typeof langObj.description === "string" && langObj.description.trim()) return true;
  if (typeof langObj.productDescription === "string" && langObj.productDescription.trim()) return true;
  if (Array.isArray(langObj.content) && langObj.content.length > 0) return true;
  return false;
}

function isLanguageComplete(langObj) {
  if (!langObj || typeof langObj !== "object") return false;
  if (langObj?._checkpoint?.complete === true) return true;
  // Backward compatibility: if older docs have no checkpoint but do have
  // translated content, treat them as complete to avoid re-translation.
  return hasMeaningfulLanguageContent(langObj);
}

function isLanguageUpToDate(langObj, englishHash) {
  if (!langObj || typeof langObj !== "object") return false;
  if (langObj?._checkpoint?.complete !== true) return false;
  const h = typeof langObj?._sourceHash === "string" ? langObj._sourceHash : "";
  if (!h) return false;
  return h === englishHash;
}

function createRunLog() {
  return {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    successes: [],
    failures: [],
    summary: {
      recallsProcessed: 0,
      languageSuccesses: 0,
      languageFailures: 0,
    },
  };
}

function flushRunLog(runLog) {
  runLog.finishedAt = new Date().toISOString();
  runLog.summary.languageSuccesses = runLog.successes.length;
  runLog.summary.languageFailures = runLog.failures.length;
  fs.writeFileSync(RUN_LOG_PATH, JSON.stringify(runLog, null, 2), "utf8");
}

/** Replace one recall in recalls.json with a full Mongo document (includes languages). */
async function upsertRecallInRecallsJson(coll, recallId) {
  const doc = await coll.findOne({ _id: recallId });
  if (!doc || !doc.slug) return false;
  const arr = readJsonArraySafe(RECALLS_JSON_PATH);
  const idx = arr.findIndex((r) => (r.slug || r.id) === doc.slug);
  if (idx >= 0) arr[idx] = doc;
  else arr.push(doc);
  arr.sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  writeJsonArray(RECALLS_JSON_PATH, arr);
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  uiHeader("Recalls Atlas  ·  Translation Engine");
  const runLog = createRunLog();
  ACTIVE_RUN_LOG = runLog;

  if (DRY_RUN) uiWarn("DRY RUN — no writes");
  if (RESET) uiWarn("RESET — clearing all existing translations");
  if (!MONGO_MODE) uiInfo("Source", "recalls.json only (no MongoDB)");
  if (OUTPUT_JSON_PATH) uiInfo("Output file", OUTPUT_JSON_PATH);
  uiInfo("Run log", RUN_LOG_PATH);
  if (!RESET && !SLUG_ARG && !RESUME_PARTIAL) {
    uiInfo("Mode", "new recalls only (use --resume-partial to backfill)");
  }
  let closeDb = null;
  let recalls = [];
  let coll = null;
  if (MONGO_MODE) {
    const { getDb, close } = require("../../database/mongodb");
    closeDb = close;
    process.stdout.write(`  ${C.cyan}▸${C.reset} Connecting to MongoDB…`);
    const db = await getDb();
    coll = db.collection("recalls");
    process.stdout.write(` ${C.green}connected${C.reset}\n`);
    if (!DRY_RUN) {
      process.stdout.write(`  ${C.cyan}▸${C.reset} Writing full Mongo snapshot to recalls.json…`);
      const allDocs = await coll.find({}).toArray();
      allDocs.sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
      writeJsonArray(RECALLS_JSON_PATH, allDocs);
      process.stdout.write(` ${C.green}done${C.reset}\n`);
    }
  } else {
    recalls = readJsonArraySafe(RECALLS_JSON_PATH);
  }

  if (OUTPUT_JSON_PATH && !RESET) {
    recalls = mergeExistingOutputRecalls(recalls, OUTPUT_JSON_PATH);
  }

  // ── Build query ─────────────────────────────────────────────────────────────
  if (MONGO_MODE) {
    let query = {};
    if (SLUG_ARG) {
      query = { slug: SLUG_ARG };
    } else if (RESET) {
      query = {};
    } else {
      query = {
        $or: [
          { translatedAt: { $exists: false } },
          { translatedAt: null },
          { translatedAt: "" },
        ],
      };
    }
    if (RESET && !DRY_RUN) {
      process.stdout.write(`  ${C.cyan}▸${C.reset} Clearing all translations…`);
      await coll.updateMany({}, { $unset: { languages: "" } });
      process.stdout.write(` ${C.green}done${C.reset}\n`);
    }
    recalls = await coll.find(query).toArray();
  } else {
    if (RESET && !DRY_RUN) {
      recalls.forEach((r) => {
        delete r.languages;
        delete r.translatedAt;
      });
      writeJsonArray(RECALLS_JSON_PATH, recalls);
    }
    if (SLUG_ARG) recalls = recalls.filter((r) => r.slug === SLUG_ARG);
    else if (!RESET && !RESUME_PARTIAL) recalls = recalls.filter((r) => !r.translatedAt);
  }

  if (!SLUG_ARG && !RESET && RESUME_PARTIAL) {
    recalls = recalls.filter((recall) =>
      TARGET_LANGS.some((l) => !isLanguageComplete(recall.languages?.[l.code]))
    );
  } else if (!SLUG_ARG && !RESET && !RESUME_PARTIAL) {
    recalls = recalls.filter((recall) => {
      if (recall.translatedAt) return false;
      const enSource = buildEnglishSource(recall);
      const englishHash = sourceHash(enSource);
      return TARGET_LANGS.some((l) => !isLanguageUpToDate(recall.languages?.[l.code], englishHash));
    });
  }
  if (LIMIT) recalls = recalls.slice(0, LIMIT);

  if (recalls.length === 0) {
    uiOk("All recalls are fully translated — nothing to do.");
    flushRunLog(runLog);
    if (closeDb) await closeDb();
    return;
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totalLangEntries = recalls.length * TARGET_LANGS.length;
  console.log("");
  uiInfo("Recalls to process:", `${recalls.length}`);
  uiInfo("Target languages:", `${TARGET_LANGS.length}  ${TARGET_LANGS.map(l => l.flag).join(" ")}`);
  uiInfo("Total lang entries:", `${totalLangEntries}`);
  if (SLUG_ARG) uiInfo("Slug filter:", SLUG_ARG);
  if (LIMIT) uiInfo("Limit:", String(LIMIT));
  console.log("");

  const globalStart = Date.now();
  let recallsDone = 0;
  const recallTimes = []; // ms per recall — used for ETA

  // ── Per-recall loop ─────────────────────────────────────────────────────────
  for (const recall of recalls) {
    const slug = recall.slug || "(unknown)";
    const shortTitle = (recall.title || recall.productDescription || slug).slice(0, 55);
    const recallStart = Date.now();

    uiDivider();
    console.log(
      `\n  ${C.bold}[${recallsDone + 1}/${recalls.length}]${C.reset}  ${shortTitle}`
    );

    // Build English source + save languages.en
    const optimizedHeadline = await optimizeEnglishHeadline(recall);
    recall.headline = optimizedHeadline;
    const enSource = buildEnglishSource(recall, optimizedHeadline);
    const totalElements = countElements(enSource);
    const englishHash = sourceHash(enSource);

    // Which languages still need translating for this recall?
    const langsNeeded = TARGET_LANGS.filter(l => {
      const existing = recall.languages?.[l.code];
      return RESET || !isLanguageUpToDate(existing, englishHash);
    });
    const langsSkipped = TARGET_LANGS.length - langsNeeded.length;

    if (langsSkipped > 0) {
      console.log(
        `  ${C.dim}  Already done: ${langsSkipped} lang(s) — skipping those${C.reset}`
      );
    }
    if (langsNeeded.length === 0 && !DRY_RUN && MONGO_MODE) {
      const enLang = LANGUAGES.find(l => l.code === "en");
      await coll.updateOne(
        { _id: recall._id },
        {
          $set: {
            headline: optimizedHeadline,
            "languages.en": { ...enSource, dir: enLang.dir, flag: enLang.flag, lang: "en" },
          },
        }
      );
    } else if (langsNeeded.length === 0 && !DRY_RUN) {
      const enLang = LANGUAGES.find((l) => l.code === "en");
      if (!recall.languages || typeof recall.languages !== "object") recall.languages = {};
      recall.languages.en = { ...enSource, dir: enLang.dir, flag: enLang.flag, lang: "en" };
      if (OUTPUT_JSON_PATH) {
        upsertRecallInFile(OUTPUT_JSON_PATH, recall);
      } else {
        writeJsonArray(RECALLS_JSON_PATH, readJsonArraySafe(RECALLS_JSON_PATH).map((r) => ((r.slug || r.id) === (recall.slug || recall.id) ? recall : r)));
      }
    }
    if (langsNeeded.length === 0) {
      console.log(`  ${C.green}  All languages already translated — skipping recall${C.reset}\n`);
      recallsDone++;
      continue;
    }

    console.log(
      `  ${C.dim}  Pending: ${langsNeeded.map(l => l.flag).join(" ")}${C.reset}\n`
    );

    if (!DRY_RUN && MONGO_MODE) {
      const enLang = LANGUAGES.find(l => l.code === "en");
      await coll.updateOne(
        { _id: recall._id },
        {
          $set: {
            headline: optimizedHeadline,
            "languages.en": { ...enSource, dir: enLang.dir, flag: enLang.flag, lang: "en" },
          },
        }
      );
    } else if (!DRY_RUN) {
      const enLang = LANGUAGES.find((l) => l.code === "en");
      if (!recall.languages || typeof recall.languages !== "object") recall.languages = {};
      recall.languages.en = { ...enSource, dir: enLang.dir, flag: enLang.flag, lang: "en" };
      if (OUTPUT_JSON_PATH) {
        upsertRecallInFile(OUTPUT_JSON_PATH, recall);
      } else {
        writeJsonArray(RECALLS_JSON_PATH, readJsonArraySafe(RECALLS_JSON_PATH).map((r) => ((r.slug || r.id) === (recall.slug || recall.id) ? recall : r)));
      }
    }

    // ── Per-language loop (saves immediately after each language) ─────────────
    for (const lang of langsNeeded) {
      const langStart = Date.now();

      process.stdout.write(
        `     ${lang.flag}  ${lang.name.padEnd(12)} ${progressBar(0, totalElements)}\r`
      );

      const translated = await translateLangObject(
        enSource,
        lang.name,
        lang.code,
        recall.languages?.[lang.code],
        (n) => {
          process.stdout.write(
            `     ${lang.flag}  ${lang.name.padEnd(12)} ${progressBar(n, totalElements)}\r`
          );
        },
        async (checkpointed) => {
          checkpointed._sourceHash = englishHash;
          if (!DRY_RUN && MONGO_MODE) {
            await coll.updateOne(
              { _id: recall._id },
              { $set: { [`languages.${lang.code}`]: checkpointed } }
            );
          } else if (!DRY_RUN) {
            if (!recall.languages || typeof recall.languages !== "object") recall.languages = {};
            recall.languages[lang.code] = checkpointed;
            if (OUTPUT_JSON_PATH) {
              upsertRecallInFile(OUTPUT_JSON_PATH, recall);
            } else {
              writeJsonArray(RECALLS_JSON_PATH, readJsonArraySafe(RECALLS_JSON_PATH).map((r) => ((r.slug || r.id) === (recall.slug || recall.id) ? recall : r)));
            }
          }
        },
        runLog,
        slug
      );

      const cleanedTranslated = sanitizeTranslatedLanguage(translated, enSource);
      cleanedTranslated.dir = lang.dir;
      cleanedTranslated.flag = lang.flag;
      cleanedTranslated.lang = lang.code;
      cleanedTranslated._sourceHash = englishHash;
      cleanedTranslated._checkpoint = { complete: true, doneKeys: [], updatedAt: new Date().toISOString() };

      const langMs = Date.now() - langStart;

      // ── Save this language to MongoDB immediately ─────────────────────────
      if (!DRY_RUN && MONGO_MODE) {
        await coll.updateOne(
          { _id: recall._id },
          { $set: { [`languages.${lang.code}`]: cleanedTranslated } }
        );

        await upsertRecallInRecallsJson(coll, recall._id);
      } else if (!DRY_RUN) {
        if (!recall.languages || typeof recall.languages !== "object") recall.languages = {};
        recall.languages[lang.code] = cleanedTranslated;
        if (OUTPUT_JSON_PATH) {
          upsertRecallInFile(OUTPUT_JSON_PATH, recall);
        } else {
          writeJsonArray(RECALLS_JSON_PATH, readJsonArraySafe(RECALLS_JSON_PATH).map((r) => ((r.slug || r.id) === (recall.slug || recall.id) ? recall : r)));
        }
      }

      process.stdout.write(
        `     ${lang.flag}  ${lang.name.padEnd(12)} ${progressBar(totalElements, totalElements)}` +
        `  ${C.green}✓${C.reset}  ${C.dim}${fmtElapsed(langMs)}${C.reset}\n`
      );
    }

    // Mark recall as fully translated
    if (!DRY_RUN && MONGO_MODE) {
      await coll.updateOne(
        { _id: recall._id },
        { $set: { translatedAt: new Date().toISOString() } }
      );

      const mirrored = await upsertRecallInRecallsJson(coll, recall._id);
      if (mirrored) {
        console.log(`  ${C.dim}Mirrored to recalls.json — slug:${C.reset} ${recall.slug}`);
      } else {
        console.log(`  ${C.yellow}⚠${C.reset} Could not mirror to recalls.json for slug ${recall.slug}`);
      }
    } else if (!DRY_RUN) {
      recall.translatedAt = new Date().toISOString();
      if (OUTPUT_JSON_PATH) {
        upsertRecallInFile(OUTPUT_JSON_PATH, recall);
      } else {
        writeJsonArray(RECALLS_JSON_PATH, readJsonArraySafe(RECALLS_JSON_PATH).map((r) => ((r.slug || r.id) === (recall.slug || recall.id) ? recall : r)));
      }
    }

    recallsDone++;
    runLog.summary.recallsProcessed = recallsDone;
    const recallMs = Date.now() - recallStart;
    recallTimes.push(recallMs);

    // ETA calculation
    const avgMs = recallTimes.reduce((a, b) => a + b, 0) / recallTimes.length;
    const remaining = recalls.length - recallsDone;
    const elapsed = Date.now() - globalStart;

    console.log(
      `\n  ${C.green}✓${C.reset} Recall saved` +
      `  ${C.dim}(took ${fmtElapsed(recallMs)})${C.reset}`
    );

    // ── Overall progress bar ─────────────────────────────────────────────────
    const overallBar = progressBar(recallsDone, recalls.length, 30);
    const etaStr = remaining > 0
      ? `  ETA ~${fmtEta(avgMs, remaining)}`
      : "  All done!";

    console.log(
      `  ${C.blue}${overallBar}${C.reset}` +
      `  ${C.dim}${recallsDone}/${recalls.length} recalls` +
      `  ·  elapsed ${fmtElapsed(elapsed)}` +
      `${etaStr}${C.reset}\n`
    );
  }

  // ── Final summary ────────────────────────────────────────────────────────────
  const totalMs = Date.now() - globalStart;
  uiDivider();
  uiHeader("Translation Complete");
  uiInfo("Recalls translated:", `${recallsDone}`);
  uiInfo("Languages per recall:", `${TARGET_LANGS.length}`);
  uiInfo("Lang entries written:", `${recallsDone * TARGET_LANGS.length}`);
  uiInfo("Total time:", fmtElapsed(totalMs));
  if (recallsDone > 0) {
    uiInfo("Avg per recall:", fmtElapsed(Math.round(totalMs / recallsDone)));
  }
  console.log("");
  flushRunLog(runLog);
  uiInfo("Run log:", RUN_LOG_PATH);

  if (closeDb) await closeDb();
  ACTIVE_RUN_LOG = null;
}

// ─── SIGINT ───────────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log(
    `\n\n  ${C.yellow}⚠${C.reset}  Interrupted — all completed languages already saved to MongoDB.\n`
  );
  process.exit(0);
});

// ─── Run ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  try {
    const runLog = ACTIVE_RUN_LOG || createRunLog();
    runLog.failures.push({ slug: "(fatal)", lang: "n/a", taskKey: "main", reason: err.message || String(err) });
    flushRunLog(runLog);
  } catch {}
  console.error(`\n  ${C.red}✗${C.reset}  Fatal error:`, err.message || err);
  process.exit(1);
});
