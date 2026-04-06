/**
 * Translates English generalRecallsTranslated/*.json into the same 10 UI languages
 * as FDA / cars (SITE_UI_LANGS minus English): es, ar, zh, fr, de, ja, pt, hi, ru, vi.
 *
 * Writes parallel files under ./translatedJson/<lang>/<sameBasename>.json
 * (slug, URLs, image paths, IDs, dates — unchanged; narrative fields translated).
 *
 * Env: OPENAI_API_KEY (required). Optional: OPENAI_MODEL (default gpt-4o-mini)
 *
 * From backend/:
 *   npm run translate-general-recalls-i18n
 *   npm run translate-general-recalls-i18n -- --lang=es
 *   npm run translate-general-recalls-i18n -- --file=accessories.json --force
 */
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config({
  path: fs.existsSync(path.join(__dirname, ".env"))
    ? path.join(__dirname, ".env")
    : path.join(__dirname, "..", "..", "..", ".env"),
});

const ROOT = __dirname;
const SOURCE_DIR = path.join(ROOT, "..", "generalRecallsTranslated");
const OUT_ROOT = path.join(ROOT, "translatedJson");

/** Matches frontend/lib/siteLocale.ts SITE_UI_LANGS (excluding en). */
const TARGET_LANGS = ["es", "ar", "zh", "fr", "de", "ja", "pt", "hi", "ru", "vi"];

const LANG_NAMES = {
  es: "Spanish",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  fr: "French",
  de: "German",
  ja: "Japanese",
  pt: "Portuguese (Brazil)",
  hi: "Hindi",
  ru: "Russian",
  vi: "Vietnamese",
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let openaiSingleton = null;
function getOpenAI() {
  if (!openaiSingleton) openaiSingleton = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openaiSingleton;
}

function parseFlags() {
  const argv = process.argv.slice(2);
  const out = { force: false, lang: null, file: null, limit: null };
  for (const a of argv) {
    if (a === "--force" || a === "-f") out.force = true;
    else if (a.startsWith("--lang=")) out.lang = a.slice(7).trim().toLowerCase();
    else if (a.startsWith("--file=")) out.file = a.slice(7).trim().toLowerCase();
    else if (a.startsWith("--limit=")) out.limit = Math.max(0, parseInt(a.slice(8), 10) || 0);
  }
  return out;
}

function recallToPayload(recall) {
  return {
    Title: recall.Title || "",
    Description: recall.Description || "",
    ConsumerContact: recall.ConsumerContact || "",
    metaDescription: recall.metaDescription || "",
    Products: (recall.Products || []).map((p) => ({
      Name: p.Name || "",
      Model: p.Model || "",
      Type: p.Type || "",
      NumberOfUnits: p.NumberOfUnits || "",
    })),
    Images: (recall.Images || []).map((im) => ({ Caption: im.Caption || "" })),
    Injuries: (recall.Injuries || []).map((x) => ({ Name: x.Name || "" })),
    Retailers: (recall.Retailers || []).map((x) => ({ Name: x.Name || "" })),
    Importers: (recall.Importers || []).map((x) => ({ Name: x.Name || "" })),
    Distributors: (recall.Distributors || []).map((x) => ({ Name: x.Name || "" })),
    Manufacturers: (recall.Manufacturers || []).map((x) => ({ Name: x.Name || "" })),
    SoldAtLabel: recall.SoldAtLabel || "",
    ManufacturerCountries: (recall.ManufacturerCountries || []).map((x) => ({
      Country: x.Country || "",
    })),
    Hazards: (recall.Hazards || []).map((x) => ({ Name: x.Name || "" })),
    Remedies: (recall.Remedies || []).map((x) => ({ Name: x.Name || "" })),
    RemedyOptions: (recall.RemedyOptions || []).map((x) => ({ Option: x.Option || "" })),
  };
}

function applyPayload(recall, payload) {
  const out = JSON.parse(JSON.stringify(recall));
  if (payload.Title != null) out.Title = payload.Title;
  if (payload.Description != null) out.Description = payload.Description;
  if (payload.ConsumerContact != null) out.ConsumerContact = payload.ConsumerContact;
  if (payload.metaDescription != null) out.metaDescription = payload.metaDescription;

  const pArr = payload.Products || [];
  if (out.Products && out.Products.length) {
    out.Products = out.Products.map((p, i) => ({
      ...p,
      ...(pArr[i]?.Name != null ? { Name: pArr[i].Name } : {}),
      ...(pArr[i]?.Model != null ? { Model: pArr[i].Model } : {}),
      ...(pArr[i]?.Type != null ? { Type: pArr[i].Type } : {}),
      ...(pArr[i]?.NumberOfUnits != null ? { NumberOfUnits: pArr[i].NumberOfUnits } : {}),
    }));
  }

  const imArr = payload.Images || [];
  if (out.Images && out.Images.length) {
    out.Images = out.Images.map((im, i) => ({
      ...im,
      ...(imArr[i]?.Caption != null ? { Caption: imArr[i].Caption } : {}),
    }));
  }

  function mapNamed(arr, payloadArr, key) {
    if (!arr || !arr.length) return arr;
    return arr.map((x, i) => ({
      ...x,
      ...(payloadArr[i]?.[key] != null ? { [key]: payloadArr[i][key] } : {}),
    }));
  }

  out.Injuries = mapNamed(out.Injuries, payload.Injuries, "Name");
  out.Retailers = mapNamed(out.Retailers, payload.Retailers, "Name");
  out.Importers = mapNamed(out.Importers, payload.Importers, "Name");
  out.Distributors = mapNamed(out.Distributors, payload.Distributors, "Name");
  out.Manufacturers = mapNamed(out.Manufacturers, payload.Manufacturers, "Name");
  if (payload.SoldAtLabel != null) out.SoldAtLabel = payload.SoldAtLabel;
  out.ManufacturerCountries = mapNamed(
    out.ManufacturerCountries,
    payload.ManufacturerCountries,
    "Country"
  );
  out.Hazards = mapNamed(out.Hazards, payload.Hazards, "Name");
  out.Remedies = mapNamed(out.Remedies, payload.Remedies, "Name");
  if (out.RemedyOptions && out.RemedyOptions.length) {
    const ro = payload.RemedyOptions || [];
    out.RemedyOptions = out.RemedyOptions.map((x, i) => ({
      ...x,
      ...(ro[i]?.Option != null ? { Option: ro[i].Option } : {}),
    }));
  }

  return out;
}

async function translatePayload(payload, langCode, languageName) {
  const system = `You translate CPSC consumer product recall content for RecallsAtlas.
Target language: ${languageName} (${langCode}).
Output a single JSON object only — same keys and array lengths as input. Translate string values; preserve meaning, numbers, dates, emails, phone numbers, URLs, SKUs, and model codes exactly as given.
Do not add or remove array entries. Plain text in strings; use \\n in Description where paragraphs should break.`;

  const user = `Translate every string in this JSON into ${languageName}. Keep structure identical.

Input:
${JSON.stringify(payload)}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.25,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI response");
  return JSON.parse(raw);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const flags = parseFlags();
  if (!OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY (backend/.env)");
    process.exit(1);
  }
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error("Missing source dir:", SOURCE_DIR);
    process.exit(1);
  }

  let langs = flags.lang ? [flags.lang] : TARGET_LANGS;
  for (const l of langs) {
    if (!TARGET_LANGS.includes(l)) {
      console.error("Unsupported --lang:", l, "use one of:", TARGET_LANGS.join(", "));
      process.exit(1);
    }
  }

  let files = fs
    .readdirSync(SOURCE_DIR)
    .filter((n) => n.endsWith(".json") && n !== "imageUrlMap.json")
    .sort();
  if (flags.file) {
    files = files.filter((n) => n.toLowerCase() === flags.file.toLowerCase());
    if (files.length === 0) {
      console.error("No file match:", flags.file);
      process.exit(1);
    }
  }

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  let apiCalls = 0;
  const t0 = Date.now();

  for (const lang of langs) {
    const languageName = LANG_NAMES[lang];
    const langDir = path.join(OUT_ROOT, lang);
    fs.mkdirSync(langDir, { recursive: true });

    for (const fileName of files) {
      const srcPath = path.join(SOURCE_DIR, fileName);
      const outPath = path.join(langDir, fileName);

      if (fs.existsSync(outPath) && !flags.force) {
        try {
          const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
          const src = JSON.parse(fs.readFileSync(srcPath, "utf8"));
          const pn = (prev.recalls || []).length;
          const sn = (src.recalls || []).length;
          if (pn === sn && prev.meta?.i18nTargetLang === lang) {
            console.log(`○ skip ${lang}/${fileName} (exists, ${sn} recalls) — use --force to redo`);
            continue;
          }
        } catch {
          /* rewrite */
        }
      }

      const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));
      const recalls = raw.recalls || [];
      const outRecalls = [];
      let limitLeft = flags.limit != null ? flags.limit : Infinity;

      console.log(`→ ${lang} / ${fileName} (${recalls.length} recalls)`);

      for (let i = 0; i < recalls.length; i++) {
        if (limitLeft <= 0) break;
        const r = recalls[i];
        const payload = recallToPayload(r);
        let translatedPayload;
        try {
          translatedPayload = await translatePayload(payload, lang, languageName);
          apiCalls++;
        } catch (e) {
          console.error(`  ✗ Recall ${r.RecallNumber || i}: ${e.message}`);
          translatedPayload = payload;
        }
        outRecalls.push(applyPayload(r, translatedPayload));
        limitLeft--;
        await sleep(150 + Math.floor(Math.random() * 350));
      }

      if (flags.limit != null && outRecalls.length < recalls.length) {
        console.warn(`  (partial: ${outRecalls.length}/${recalls.length} due to --limit)`);
      }

      const outDoc = {
        meta: {
          ...(raw.meta || {}),
          i18nSource: "generalRecallsTranslated",
          i18nSourceFile: fileName,
          i18nTargetLang: lang,
          i18nLanguageName: languageName,
          i18nTranslatedAt: new Date().toISOString(),
          i18nOpenaiModel: MODEL,
        },
        recalls: flags.limit != null ? [...outRecalls, ...recalls.slice(outRecalls.length)] : outRecalls,
      };

      fs.writeFileSync(outPath, JSON.stringify(outDoc, null, 2), "utf8");
      console.log(`  ✓ wrote ${outPath}`);
    }
  }

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s, OpenAI calls: ${apiCalls}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
