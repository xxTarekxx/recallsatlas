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
 * Usage (from backend/):
 *   node scripts/recallTranslate.js                  # translate all untranslated recalls
 *   node scripts/recallTranslate.js --dry-run        # preview only, no writes
 *   node scripts/recallTranslate.js --slug some-slug # translate a single recall by slug
 *   node scripts/recallTranslate.js --reset          # clear all translations (re-translate everything)
 *
 * SEO note:
 *   Each language generates a separate URL on the frontend:
 *   /recalls/[slug]        → English (default)
 *   /es/recalls/[slug]     → Spanish
 *   /ar/recalls/[slug]     → Arabic (rtl)
 *   etc.
 *
 * Env: OPENAI_API_KEY, MONGODB_URI (in backend/.env)
 */

const fs   = require("fs");
const path = require("path");

// ─── Env ─────────────────────────────────────────────────────────────────────

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error("Missing OPENAI_API_KEY"); process.exit(1); }

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL        = "gpt-4.1-mini";
const RATE_LIMIT_MS = 60;   // ms between OpenAI calls — stay well within rate limits
const BATCH_SIZE    = 5;    // recalls processed concurrently

const flags     = process.argv.slice(2).filter(a => a.startsWith("--"));
const args      = process.argv.slice(2).filter(a => !a.startsWith("--"));
const DRY_RUN   = flags.includes("--dry-run");
const RESET     = flags.includes("--reset");
const SLUG_ARG  = flags.find(f => f.startsWith("--slug="))?.split("=")[1]
               || (args[0] && !args[0].startsWith("--") ? args[0] : null);

// ─── Languages ────────────────────────────────────────────────────────────────

/**
 * Each entry:
 *   code  — BCP-47 language code (used in URLs: /es/recalls/[slug])
 *   name  — passed to OpenAI as the target language name
 *   flag  — emoji shown in the language switcher UI
 *   dir   — text direction; "rtl" for Arabic and Persian
 */
const LANGUAGES = [
  { code: "en", name: "English",    flag: "🇺🇸", dir: "ltr" },
  { code: "es", name: "Spanish",    flag: "🇪🇸", dir: "ltr" },
  { code: "de", name: "German",     flag: "🇩🇪", dir: "ltr" },
  { code: "ja", name: "Japanese",   flag: "🇯🇵", dir: "ltr" },
  { code: "fr", name: "French",     flag: "🇫🇷", dir: "ltr" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", dir: "ltr" },
  { code: "ru", name: "Russian",    flag: "🇷🇺", dir: "ltr" },
  { code: "it", name: "Italian",    flag: "🇮🇹", dir: "ltr" },
  { code: "nl", name: "Dutch",      flag: "🇳🇱", dir: "ltr" },
  { code: "pl", name: "Polish",     flag: "🇵🇱", dir: "ltr" },
  { code: "tr", name: "Turkish",    flag: "🇹🇷", dir: "ltr" },
  { code: "fa", name: "Persian",    flag: "🇮🇷", dir: "rtl" },
  { code: "zh", name: "Chinese",    flag: "🇨🇳", dir: "ltr" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳", dir: "ltr" },
  { code: "id", name: "Indonesian", flag: "🇮🇩", dir: "ltr" },
  { code: "cs", name: "Czech",      flag: "🇨🇿", dir: "ltr" },
  { code: "ko", name: "Korean",     flag: "🇰🇷", dir: "ltr" },
  { code: "uk", name: "Ukrainian",  flag: "🇺🇦", dir: "ltr" },
  { code: "hu", name: "Hungarian",  flag: "🇭🇺", dir: "ltr" },
  { code: "ar", name: "Arabic",     flag: "🇸🇦", dir: "rtl" },
];

const TARGET_LANGS = LANGUAGES.filter(l => l.code !== "en");

// ─── Terminal UI ─────────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
};

function uiHeader(title) {
  const line = "═".repeat(54);
  console.log(`\n${C.cyan}${C.bold}  ${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title.padEnd(54)}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${line}${C.reset}\n`);
}

function uiPhase(label) {
  console.log(`  ${C.cyan}▸${C.reset} ${label}`);
}

function uiOk(msg) {
  console.log(`     ${C.green}✓${C.reset} ${msg}`);
}

function uiWarn(msg) {
  console.log(`     ${C.yellow}⚠${C.reset} ${msg}`);
}

function uiInfo(msg) {
  console.log(`     ${C.dim}${msg}${C.reset}`);
}

function progressBar(current, total, width = 28) {
  if (total <= 0) total = 1;
  const ratio   = Math.min(current, total) / total;
  const filled  = Math.round(ratio * width);
  const bar     = "█".repeat(filled) + "░".repeat(width - filled);
  return `[${bar}] ${Math.round(ratio * 100)}%`;
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

/**
 * Translate a plain text string into the target language.
 * Returns the original on failure (never throws).
 */
async function translateText(text, langName) {
  if (!text || typeof text !== "string" || !text.trim()) return text;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
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
          ``,
          text,
        ].join("\n"),
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return text;

    const data = await res.json();
    return (
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      text
    ).trim();

  } catch {
    clearTimeout(timer);
    return text;
  }
}

/**
 * Translate only the visible link text in an HTML anchor string.
 * Keeps href, target, rel, and all attributes intact.
 *
 * Input:  'For details see <a href="https://fda.gov/..." ...>FDA Notice</a>.'
 * Output: 'Para más detalles consulte <a href="https://fda.gov/..." ...>Aviso de la FDA</a>.'
 */
async function translateAuthorityLink(html, langName) {
  if (!html || typeof html !== "string") return html;

  // Replace each anchor's visible text while keeping the tag intact
  const parts = [];
  let cursor = 0;
  const tagRe = /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/gi;
  let match;

  while ((match = tagRe.exec(html)) !== null) {
    // Text before this anchor
    if (match.index > cursor) {
      const before = html.slice(cursor, match.index);
      parts.push(translateText(before, langName));
    }
    // Opening tag stays as-is; only translate the inner text
    const openTag   = match[1];
    const innerText = match[2];
    const closeTag  = match[3];
    parts.push(
      translateText(innerText, langName).then(t => `${openTag}${t}${closeTag}`)
    );
    cursor = match.index + match[0].length;
  }

  // Remaining text after last anchor
  if (cursor < html.length) {
    parts.push(translateText(html.slice(cursor), langName));
  }

  // If no anchors found, translate the whole string
  if (parts.length === 0) return translateText(html, langName);

  const results = await Promise.all(parts);
  return results.join("");
}

// ─── Build English source object ─────────────────────────────────────────────

/**
 * Extracts all translatable fields from a raw MongoDB recall document
 * and returns them as a clean "en" language object.
 * Non-translatable fields (dates, URLs, sortOrder, etc.) are excluded.
 */
function buildEnglishSource(recall) {
  const content = (Array.isArray(recall.content) ? recall.content : []).map(section => {
    const s = {};
    if (section.subtitle)      s.subtitle      = section.subtitle;
    if (section.text)          s.text          = section.text;
    if (Array.isArray(section.authorityLinks) && section.authorityLinks.length) {
      s.authorityLinks = section.authorityLinks;
    }
    // facts block (What Was Recalled)
    if (section.facts && typeof section.facts === "object") {
      s.facts = { ...section.facts };
    }
    return s;
  });

  return {
    title:             recall.title             || recall.product || "",
    description:       recall.description       || "",
    productDescription: recall.product          || recall.productDescription || "",
    reason:            recall.reason            || "",
    disclaimer:        recall.disclaimer        || "",
    pageTypeLabel:     recall.pageTypeLabel      || "",
    label:             recall.label             || "",
    regulatedProducts: typeof recall.regulatedProducts === "string"
                         ? recall.regulatedProducts
                         : (Array.isArray(recall.regulatedProducts)
                             ? recall.regulatedProducts.join(", ")
                             : ""),
    /** "Ongoing" or "Terminated" — derived from the terminated boolean so it can be translated */
    status:            recall.terminated === true ? "Terminated" : "Ongoing",
    content,
  };
}

// ─── Translate one language object ───────────────────────────────────────────

async function translateLangObject(source, langName, onProgress) {
  const result = JSON.parse(JSON.stringify(source)); // deep clone
  let done = 0;

  // Helper that wraps translateText + progress tick
  async function t(text) {
    await delay(RATE_LIMIT_MS);
    const translated = await translateText(text, langName);
    done++;
    onProgress(done);
    return translated;
  }

  // Top-level string fields
  const topFields = [
    "title", "description", "productDescription",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
    "status",
  ];
  for (const key of topFields) {
    if (result[key]) result[key] = await t(result[key]);
  }

  // content[] sections
  for (const section of result.content || []) {
    if (section.subtitle) section.subtitle = await t(section.subtitle);
    if (section.text)     section.text     = await t(section.text);

    // authorityLinks — translate visible text only
    if (Array.isArray(section.authorityLinks)) {
      for (let i = 0; i < section.authorityLinks.length; i++) {
        await delay(RATE_LIMIT_MS);
        section.authorityLinks[i] = await translateAuthorityLink(
          section.authorityLinks[i], langName
        );
        done++;
        onProgress(done);
      }
    }

    // facts object (What Was Recalled section)
    if (section.facts && typeof section.facts === "object") {
      for (const fKey of Object.keys(section.facts)) {
        if (typeof section.facts[fKey] === "string" && section.facts[fKey]) {
          section.facts[fKey] = await t(section.facts[fKey]);
        }
      }
    }
  }

  return result;
}

// ─── Count translatable elements ─────────────────────────────────────────────

function countElements(source) {
  const topFields = [
    "title", "description", "productDescription",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
    "status",
  ];
  let n = topFields.filter(k => source[k]).length;
  for (const section of source.content || []) {
    if (section.subtitle) n++;
    if (section.text)     n++;
    if (Array.isArray(section.authorityLinks)) n += section.authorityLinks.length;
    if (section.facts) n += Object.values(section.facts).filter(v => typeof v === "string" && v).length;
  }
  return n;
}

// ─── Delay ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { getDb, close } = require("../database/mongodb");

  uiHeader("RecallsAtlas · Translation Engine");

  if (DRY_RUN) uiWarn("DRY RUN — no writes to MongoDB");
  if (RESET)   uiWarn("RESET — clearing all existing translations");

  uiPhase("Connecting to MongoDB…");
  const db   = await getDb();
  const coll = db.collection("recalls");
  uiOk("Connected");

  // Build query
  let query = {};
  if (SLUG_ARG) {
    query = { slug: SLUG_ARG };
    uiInfo(`Single slug mode: ${SLUG_ARG}`);
  } else if (RESET) {
    query = {};
  } else {
    // Find recalls missing at least one target language translation
    const missingLangQueries = TARGET_LANGS.map(l => ({
      [`languages.${l.code}`]: { $exists: false },
    }));
    query = { $or: missingLangQueries };
  }

  if (RESET && !DRY_RUN) {
    uiPhase("Clearing all translations…");
    await coll.updateMany({}, { $unset: { languages: "" } });
    uiOk("Cleared");
  }

  const recalls = await coll.find(query).toArray();

  if (recalls.length === 0) {
    uiOk("All recalls are fully translated. Nothing to do.");
    await close();
    return;
  }

  uiInfo(`Recalls to process: ${recalls.length}`);
  uiInfo(`Target languages: ${TARGET_LANGS.length} (${TARGET_LANGS.map(l => l.flag + " " + l.code).join("  ")})`);
  console.log("");

  let recallsDone = 0;

  for (const recall of recalls) {
    const slug = recall.slug || recall.id || "(unknown)";
    const shortTitle = (recall.title || recall.product || slug).slice(0, 60);

    uiPhase(`[${recallsDone + 1}/${recalls.length}] ${shortTitle}`);

    // Build English source
    const enSource = buildEnglishSource(recall);
    const totalElements = countElements(enSource);

    // Ensure languages.en is set
    if (!DRY_RUN) {
      const enLang = LANGUAGES.find(l => l.code === "en");
      await coll.updateOne(
        { _id: recall._id },
        { $set: {
          "languages.en": {
            ...enSource,
            dir:  enLang.dir,
            flag: enLang.flag,
            lang: "en",
          }
        }}
      );
    }

    // Translate into each target language
    for (const lang of TARGET_LANGS) {
      const existingTranslation = recall.languages?.[lang.code];

      // Skip if already fully translated (resume safety)
      if (existingTranslation && existingTranslation.title && !RESET) {
        uiInfo(`  ${lang.flag} ${lang.code} already done — skipping`);
        continue;
      }

      let elemsDone = 0;

      process.stdout.write(
        `     ${lang.flag} ${lang.name.padEnd(12)} ${progressBar(0, totalElements)}\r`
      );

      const translated = await translateLangObject(enSource, lang.name, (n) => {
        elemsDone = n;
        process.stdout.write(
          `     ${lang.flag} ${lang.name.padEnd(12)} ${progressBar(n, totalElements)}\r`
        );
      });

      // Add metadata
      translated.dir  = lang.dir;
      translated.flag = lang.flag;
      translated.lang = lang.code;

      process.stdout.write(
        `     ${lang.flag} ${lang.name.padEnd(12)} ${progressBar(totalElements, totalElements)}  ✓\n`
      );

      if (!DRY_RUN) {
        await coll.updateOne(
          { _id: recall._id },
          { $set: { [`languages.${lang.code}`]: translated } }
        );
      }
    }

    // Mark recall as fully translated
    if (!DRY_RUN) {
      await coll.updateOne(
        { _id: recall._id },
        { $set: { translatedAt: new Date().toISOString() } }
      );
    }

    recallsDone++;
    uiOk(`Done (${recallsDone}/${recalls.length})`);
    console.log("");
  }

  uiHeader("Complete");
  console.log(`  ${C.green}${C.bold}Translated: ${recallsDone} recall(s)${C.reset}`);
  console.log(`  ${C.green}${C.bold}Languages:  ${TARGET_LANGS.length} per recall${C.reset}`);
  console.log(`  ${C.dim}Total language entries written: ${recallsDone * TARGET_LANGS.length}${C.reset}\n`);

  await close();
}

// ─── SIGINT ───────────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log(`\n${C.yellow}  ⚠ Interrupted. Progress already saved to MongoDB.${C.reset}\n`);
  process.exit(0);
});

// ─── Run ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error(err);
  process.exit(1);
});
