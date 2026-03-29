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
 *   node scripts/recallTranslate.js                  # translate all untranslated recalls
 *   node scripts/recallTranslate.js --dry-run        # preview only, no writes
 *   node scripts/recallTranslate.js --slug=some-slug # translate a single recall by slug
 *   node scripts/recallTranslate.js --reset          # clear all translations (re-translate everything)
 *
 * Env: OPENAI_API_KEY, MONGODB_URI (in backend/.env)
 */

const path = require("path");
const fs = require("fs");

// ─── Env ──────────────────────────────────────────────────────────────────────

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error("Missing OPENAI_API_KEY"); process.exit(1); }

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL         = "gpt-4.1-mini";
const RATE_LIMIT_MS = 30;   // ms between OpenAI calls

const flags    = process.argv.slice(2).filter(a => a.startsWith("--"));
const args     = process.argv.slice(2).filter(a => !a.startsWith("--"));
const DRY_RUN  = flags.includes("--dry-run");
const RESET    = flags.includes("--reset");
const ONE      = flags.includes("--one");
const LIMIT_ARG = Number((flags.find(f => f.startsWith("--limit=")) || "").split("=")[1]);
const SLUG_ARG = flags.find(f => f.startsWith("--slug="))?.split("=")[1]
              || (args[0] && !args[0].startsWith("--") ? args[0] : null);
const LIMIT = ONE ? 1 : (Number.isFinite(LIMIT_ARG) && LIMIT_ARG > 0 ? Math.floor(LIMIT_ARG) : null);
const RECALLS_JSON_PATH = path.join(__dirname, "recalls.json");

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

// ─── Terminal colours ─────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
};

// ─── Terminal UI helpers ──────────────────────────────────────────────────────

function uiHeader(title) {
  const w    = 58;
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
  const ratio  = Math.min(current, total) / total;
  const filled = Math.round(ratio * width);
  const bar    = "█".repeat(filled) + "░".repeat(width - filled);
  const pct    = String(Math.round(ratio * 100)).padStart(3);
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

async function translateAuthorityLink(html, langName) {
  if (!html || typeof html !== "string") return html;

  const parts  = [];
  let cursor   = 0;
  const tagRe  = /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/gi;
  let match;

  while ((match = tagRe.exec(html)) !== null) {
    if (match.index > cursor) {
      parts.push(translateText(html.slice(cursor, match.index), langName));
    }
    const [, openTag, innerText, closeTag] = match;
    parts.push(
      translateText(innerText, langName).then(t => `${openTag}${t}${closeTag}`)
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < html.length) parts.push(translateText(html.slice(cursor), langName));
  if (parts.length === 0)   return translateText(html, langName);

  return (await Promise.all(parts)).join("");
}

// ─── Build English source ─────────────────────────────────────────────────────

function buildEnglishSource(recall) {
  const content = (Array.isArray(recall.content) ? recall.content : [])
    .filter((section) => String(section?.subtitle || "").toLowerCase() !== "what was recalled")
    .map(section => {
    const s = {};
    if (section.subtitle) s.subtitle = section.subtitle;
    if (section.text)     s.text     = section.text;
    if (Array.isArray(section.authorityLinks) && section.authorityLinks.length) {
      s.authorityLinks = section.authorityLinks;
    }
    if (section.facts && typeof section.facts === "object") {
      s.facts = { ...section.facts };
    }
    return s;
  });

  return {
    title:              recall.title             || "",
    description:        recall.description       || "",
    productDescription: recall.productDescription || "",
    reason:             recall.reason            || "",
    disclaimer:         recall.disclaimer        || "",
    pageTypeLabel:      recall.pageTypeLabel     || "",
    label:              recall.label             || "",
    regulatedProducts:  typeof recall.regulatedProducts === "string"
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
    "title", "description", "productDescription",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
  ];
  let n = topFields.filter(k => source[k]).length;
  for (const section of source.content || []) {
    if (section.subtitle) n++;
    if (section.text)     n++;
    if (Array.isArray(section.authorityLinks)) n += section.authorityLinks.length;
    if (section.facts) {
      n += Object.values(section.facts).filter(v => typeof v === "string" && v).length;
    }
  }
  return n;
}

// ─── Translate one language ───────────────────────────────────────────────────

async function translateLangObject(source, langName, existingLang, onProgress, onCheckpoint) {
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
    const out = await translateText(sourceText, langName);
    assign(out);
    doneSet.add(taskKey);
    markDone(taskKey);
    await checkpoint();
  }

  const topFields = [
    "title", "description", "productDescription",
    "reason", "disclaimer", "pageTypeLabel", "label", "regulatedProducts",
  ];
  for (const key of topFields) {
    await t(`top:${key}`, source[key], (v) => { result[key] = v; });
  }

  const sourceContent = Array.isArray(source.content) ? source.content : [];
  if (!Array.isArray(result.content)) result.content = [];

  for (let sIdx = 0; sIdx < sourceContent.length; sIdx++) {
    const srcSection = sourceContent[sIdx] || {};
    const outSection = result.content[sIdx] || {};
    result.content[sIdx] = outSection;

    await t(`section:${sIdx}:subtitle`, srcSection.subtitle, (v) => { outSection.subtitle = v; });
    await t(`section:${sIdx}:text`, srcSection.text, (v) => { outSection.text = v; });

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
  const { getDb, close } = require("../database/mongodb");

  uiHeader("Recalls Atlas  ·  Translation Engine");

  if (DRY_RUN) uiWarn("DRY RUN — no writes to MongoDB");
  if (RESET)   uiWarn("RESET — clearing all existing translations");

  process.stdout.write(`  ${C.cyan}▸${C.reset} Connecting to MongoDB…`);
  const db   = await getDb();
  const coll = db.collection("recalls");
  process.stdout.write(` ${C.green}connected${C.reset}\n`);

  if (!DRY_RUN) {
    process.stdout.write(`  ${C.cyan}▸${C.reset} Writing full Mongo snapshot to recalls.json…`);
    const allDocs = await coll.find({}).toArray();
    allDocs.sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
    writeJsonArray(RECALLS_JSON_PATH, allDocs);
    process.stdout.write(` ${C.green}done${C.reset}\n`);
  }

  // ── Build query ─────────────────────────────────────────────────────────────
  let query = {};
  if (SLUG_ARG) {
    query = { slug: SLUG_ARG };
  } else if (RESET) {
    query = {};
  } else {
    query = {
      $or: TARGET_LANGS.map(l => ({
        $or: [
          { [`languages.${l.code}`]: { $exists: false } },
          { [`languages.${l.code}._checkpoint.complete`]: { $ne: true } },
        ],
      })),
    };
  }

  if (RESET && !DRY_RUN) {
    process.stdout.write(`  ${C.cyan}▸${C.reset} Clearing all translations…`);
    await coll.updateMany({}, { $unset: { languages: "" } });
    process.stdout.write(` ${C.green}done${C.reset}\n`);
  }

  let recalls = await coll.find(query).toArray();
  if (LIMIT) recalls = recalls.slice(0, LIMIT);

  if (recalls.length === 0) {
    uiOk("All recalls are fully translated — nothing to do.");
    await close();
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

  const globalStart  = Date.now();
  let   recallsDone  = 0;
  const recallTimes  = []; // ms per recall — used for ETA

  // ── Per-recall loop ─────────────────────────────────────────────────────────
  for (const recall of recalls) {
    const slug       = recall.slug || "(unknown)";
    const shortTitle = (recall.title || recall.productDescription || slug).slice(0, 55);
    const recallStart = Date.now();

    uiDivider();
    console.log(
      `\n  ${C.bold}[${recallsDone + 1}/${recalls.length}]${C.reset}  ${shortTitle}`
    );

    // Which languages still need translating for this recall?
    const langsNeeded = TARGET_LANGS.filter(l => {
      const existing = recall.languages?.[l.code];
      return RESET || !existing || existing?._checkpoint?.complete !== true;
    });
    const langsSkipped = TARGET_LANGS.length - langsNeeded.length;

    if (langsSkipped > 0) {
      console.log(
        `  ${C.dim}  Already done: ${langsSkipped} lang(s) — skipping those${C.reset}`
      );
    }
    if (langsNeeded.length === 0) {
      console.log(`  ${C.green}  All languages already translated — skipping recall${C.reset}\n`);
      recallsDone++;
      continue;
    }

    console.log(
      `  ${C.dim}  Pending: ${langsNeeded.map(l => l.flag).join(" ")}${C.reset}\n`
    );

    // Build English source + save languages.en
    const enSource      = buildEnglishSource(recall);
    const totalElements = countElements(enSource);

    if (!DRY_RUN) {
      const enLang = LANGUAGES.find(l => l.code === "en");
      await coll.updateOne(
        { _id: recall._id },
        { $set: { "languages.en": { ...enSource, dir: enLang.dir, flag: enLang.flag, lang: "en" } } }
      );
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
        recall.languages?.[lang.code],
        (n) => {
        process.stdout.write(
          `     ${lang.flag}  ${lang.name.padEnd(12)} ${progressBar(n, totalElements)}\r`
        );
        },
        async (checkpointed) => {
          if (!DRY_RUN) {
            await coll.updateOne(
              { _id: recall._id },
              { $set: { [`languages.${lang.code}`]: checkpointed } }
            );
          }
        }
      );

      translated.dir  = lang.dir;
      translated.flag = lang.flag;
      translated.lang = lang.code;
      translated._checkpoint = { complete: true, doneKeys: [], updatedAt: new Date().toISOString() };

      const langMs = Date.now() - langStart;

      // ── Save this language to MongoDB immediately ─────────────────────────
      if (!DRY_RUN) {
        await coll.updateOne(
          { _id: recall._id },
          { $set: { [`languages.${lang.code}`]: translated } }
        );

        await upsertRecallInRecallsJson(coll, recall._id);
      }

      process.stdout.write(
        `     ${lang.flag}  ${lang.name.padEnd(12)} ${progressBar(totalElements, totalElements)}` +
        `  ${C.green}✓${C.reset}  ${C.dim}${fmtElapsed(langMs)}${C.reset}\n`
      );
    }

    // Mark recall as fully translated
    if (!DRY_RUN) {
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
    }

    recallsDone++;
    const recallMs = Date.now() - recallStart;
    recallTimes.push(recallMs);

    // ETA calculation
    const avgMs     = recallTimes.reduce((a, b) => a + b, 0) / recallTimes.length;
    const remaining = recalls.length - recallsDone;
    const elapsed   = Date.now() - globalStart;

    console.log(
      `\n  ${C.green}✓${C.reset} Recall saved` +
      `  ${C.dim}(took ${fmtElapsed(recallMs)})${C.reset}`
    );

    // ── Overall progress bar ─────────────────────────────────────────────────
    const overallBar = progressBar(recallsDone, recalls.length, 30);
    const etaStr     = remaining > 0
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

  await close();
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
  console.error(`\n  ${C.red}✗${C.reset}  Fatal error:`, err.message || err);
  process.exit(1);
});
