/**
 * Translates generalRecallsTranslated/*.json into all SITE_UI_LANGS (en + 10 non-English),
 * same locale codes as FDA recalls.json / frontend/lib/siteLocale.ts.
 *
 * Output: ./translatedJson/<sameBasename>.json — one file per category (not per-language folders).
 * Each recall includes languages: { en: {...}, es: {...}, ... } with narrative fields only,
 * plus dir + lang on each block (like recalls.json language entries).
 * Top-level recall fields stay English from source (IDs, URLs, dates, image paths, etc.).
 *
 * Progress: batched parallel OpenAI calls (default concurrency 4); writes after each batch.
 * Resume via meta.i18nProgressByLang (consecutive recalls done per locale).
 *
 * Env: OPENAI_API_KEY (required). OPENAI_MODEL (default gpt-4o-mini).
 *      I18N_TRANSLATE_CONCURRENCY (default 4, max 24) — parallel requests per batch.
 *      I18N_TRANSLATE_DELAY_MS (default 35) — pause between batches (0 to disable).
 *      NO_COLOR=1 — plain text. FORCE_COLOR=1 — color even when not a TTY.
 *      I18N_TRANSLATE_TOKEN_LOG=0 — disable append to ./i18nTokenLog.jsonl
 *
 * From backend/:
 *   npm run translate-general-recalls-i18n
 *   npm run translate-general-recalls-i18n -- --lang=es --concurrency=8
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

/** Matches frontend/lib/siteLocale.ts SITE_UI_LANGS (order preserved). */
const SITE_UI_LANGS = ["en", "es", "ar", "zh", "fr", "de", "ja", "pt", "hi", "ru", "vi"];

const TARGET_LANGS_NON_EN = SITE_UI_LANGS.filter((c) => c !== "en");

const LANG_NAMES = {
  en: "English",
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

/** Terminal styling (ANSI); disabled when NO_COLOR or non-TTY unless FORCE_COLOR=1. */
const COLOR =
  (process.stdout.isTTY || process.env.FORCE_COLOR === "1") && process.env.NO_COLOR == null;

function esc(code, s) {
  return COLOR ? `\x1b[${code}m${s}\x1b[0m` : s;
}
const t = {
  bold: (s) => esc(1, s),
  dim: (s) => esc(2, s),
  red: (s) => esc(31, s),
  green: (s) => esc(32, s),
  yellow: (s) => esc(33, s),
  blue: (s) => esc(34, s),
  magenta: (s) => esc(35, s),
  cyan: (s) => esc(36, s),
  white: (s) => esc(37, s),
  gray: (s) => esc(90, s),
};

const LANG_COLOR = {
  es: 32,
  ar: 35,
  zh: 33,
  fr: 34,
  de: 36,
  ja: 31,
  pt: 32,
  hi: 33,
  ru: 36,
  vi: 34,
};

function langPaint(lang) {
  const code = LANG_COLOR[lang] ?? 37;
  return esc(code, lang);
}

function hr() {
  const cols = process.stdout.columns || 64;
  const w = Math.max(40, Math.min(72, cols - 2));
  console.log(t.dim("─".repeat(w)));
}

function tag(label, colorFn) {
  return colorFn(` ${label} `);
}

const TOKEN_LOG_PATH = path.join(ROOT, "i18nTokenLog.jsonl");

function tokenLogEnabled() {
  return process.env.I18N_TRANSLATE_TOKEN_LOG !== "0" && process.env.I18N_TRANSLATE_TOKEN_LOG !== "false";
}

function appendTokenLog(entry) {
  if (!tokenLogEnabled()) return;
  try {
    fs.appendFileSync(TOKEN_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    /* ignore log fs errors */
  }
}

/** 10-char bar + percent for current locale progress (done of N recalls). */
function formatLocaleProgressBar(done, total) {
  if (!total) return { pct: 0, barStr: "░░░░░░░░░░" };
  const pct = Math.min(100, Math.round((done / total) * 100));
  const filled = Math.round((pct / 100) * 10);
  const f = Math.min(10, Math.max(0, filled));
  const barStr = "█".repeat(f) + "░".repeat(10 - f);
  return { pct, barStr };
}

let openaiSingleton = null;
function getOpenAI() {
  if (!openaiSingleton) openaiSingleton = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openaiSingleton;
}

function parseFlags() {
  const argv = process.argv.slice(2);
  const out = { force: false, lang: null, file: null, limit: null, concurrency: null };
  for (const a of argv) {
    if (a === "--force" || a === "-f") out.force = true;
    else if (a.startsWith("--lang=")) out.lang = a.slice(7).trim().toLowerCase();
    else if (a.startsWith("--file=")) out.file = a.slice(7).trim().toLowerCase();
    else if (a.startsWith("--limit=")) out.limit = Math.max(0, parseInt(a.slice(8), 10) || 0);
    else if (a.startsWith("--concurrency=")) {
      const n = parseInt(a.slice(14), 10);
      if (!Number.isNaN(n) && n > 0) out.concurrency = n;
    }
  }
  return out;
}

function getConcurrency(flags) {
  const fromEnv = parseInt(process.env.I18N_TRANSLATE_CONCURRENCY || "", 10);
  const raw = flags.concurrency ?? (Number.isNaN(fromEnv) ? 4 : fromEnv);
  return Math.max(1, Math.min(24, raw));
}

function getBatchDelayMs() {
  const raw = process.env.I18N_TRANSLATE_DELAY_MS;
  const n = raw == null || raw === "" ? 35 : parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function wrapLanguageBlock(code, payload) {
  const rtl = code === "ar";
  return {
    ...payload,
    dir: rtl ? "rtl" : "ltr",
    lang: code,
  };
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
  const u = completion.usage;
  const usage =
    u && typeof u === "object"
      ? {
          prompt_tokens: Number(u.prompt_tokens) || 0,
          completion_tokens: Number(u.completion_tokens) || 0,
          total_tokens: Number(u.total_tokens) || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return { data: JSON.parse(raw), usage };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function initOutRecallsFromSource(recalls) {
  return recalls.map((r) => {
    const base = JSON.parse(JSON.stringify(r));
    base.languages = {
      en: wrapLanguageBlock("en", recallToPayload(r)),
    };
    return base;
  });
}

function mergePrevOutRecalls(prevRecalls, sourceRecalls) {
  const N = sourceRecalls.length;
  const out = [];
  for (let i = 0; i < N; i++) {
    const base = JSON.parse(JSON.stringify(sourceRecalls[i]));
    const pr = prevRecalls[i];
    if (pr && pr.languages && typeof pr.languages === "object") {
      base.languages = JSON.parse(JSON.stringify(pr.languages));
      if (!base.languages.en) {
        base.languages.en = wrapLanguageBlock("en", recallToPayload(sourceRecalls[i]));
      }
    } else {
      base.languages = {
        en: wrapLanguageBlock("en", recallToPayload(sourceRecalls[i])),
      };
    }
    out.push(base);
  }
  return out;
}

function isProgressComplete(progressByLang, N, langs) {
  for (const L of langs) {
    if ((progressByLang[L] || 0) < N) return false;
  }
  return true;
}

function buildMeta(raw, fileName, progressByLang, N, langsScope) {
  const inProgress = !isProgressComplete(progressByLang, N, langsScope);
  return {
    ...(raw.meta || {}),
    i18nSource: "generalRecallsTranslated",
    i18nSourceFile: fileName,
    i18nUiLangs: [...SITE_UI_LANGS],
    i18nProgressByLang: { ...progressByLang },
    i18nInProgress: inProgress,
    i18nTranslatedAt: new Date().toISOString(),
    i18nOpenaiModel: MODEL,
  };
}

async function main() {
  const flags = parseFlags();
  if (flags.limit != null && flags.limit === 0) {
    console.error(t.red("--limit must be >= 1 (or omit the flag)"));
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error(t.red("Set OPENAI_API_KEY (backend/.env or openaiTranslating/.env)"));
    process.exit(1);
  }
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(t.red("Missing source dir:"), SOURCE_DIR);
    process.exit(1);
  }

  let langs = flags.lang ? [flags.lang] : TARGET_LANGS_NON_EN;
  for (const l of langs) {
    if (!TARGET_LANGS_NON_EN.includes(l)) {
      console.error(
        t.red("Unsupported --lang:"),
        l,
        t.dim("use one of:"),
        TARGET_LANGS_NON_EN.join(", ")
      );
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
      console.error(t.red("No file match:"), flags.file);
      process.exit(1);
    }
  }

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  let apiCalls = 0;
  let tokenPromptTotal = 0;
  let tokenCompletionTotal = 0;
  let tokenGrandTotal = 0;
  const t0 = Date.now();

  const concurrency = getConcurrency(flags);
  const batchDelayMs = getBatchDelayMs();
  console.log();
  hr();
  console.log(
    t.bold(t.cyan("General recalls · i18n translate")),
    t.dim("·"),
    tag("OPENAI", t.magenta),
    t.dim(MODEL)
  );
  console.log(
    t.dim("Source"),
    t.white(SOURCE_DIR),
    t.dim("→"),
    t.dim("out"),
    t.white(OUT_ROOT)
  );
  console.log(
    t.dim("Files"),
    t.bold(String(files.length)),
    t.dim("· locales"),
    t.bold(String(langs.length)),
    langs.length === TARGET_LANGS_NON_EN.length ? t.dim("(all 10)") : t.yellow("(filtered)"),
    t.dim("· concurrency"),
    t.bold(String(concurrency)),
    t.dim("· batch delay"),
    t.bold(`${batchDelayMs}ms`)
  );
  if (flags.force) console.log(tag("FORCE", t.yellow), t.dim("re-translating requested paths"));
  if (flags.limit != null) console.log(tag("LIMIT", t.yellow), t.dim(String(flags.limit)), t.dim("API calls"));
  if (tokenLogEnabled()) {
    console.log(
      t.dim("Token log"),
      t.white(TOKEN_LOG_PATH),
      t.dim("(set I18N_TRANSLATE_TOKEN_LOG=0 to disable)")
    );
  }
  hr();
  console.log();

  for (const fileName of files) {
    const srcPath = path.join(SOURCE_DIR, fileName);
    const outPath = path.join(OUT_ROOT, fileName);

    const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));
    const recalls = raw.recalls || [];
    const N = recalls.length;

    let outRecalls = initOutRecallsFromSource(recalls);
    let progressByLang = {};
    for (const L of TARGET_LANGS_NON_EN) progressByLang[L] = 0;

    if (!flags.force && fs.existsSync(outPath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
        const pn = (prev.recalls || []).length;
        if (pn !== N) {
          console.warn(
            tag("WARN", t.yellow),
            t.white(fileName),
            t.dim("existing"),
            t.yellow(String(pn)),
            t.dim("recalls ≠ source"),
            t.yellow(String(N)),
            t.dim("— rebuilding")
          );
        } else if (prev.meta?.i18nTargetLang != null && !prev.meta?.i18nProgressByLang) {
          console.warn(
            tag("WARN", t.yellow),
            t.white(fileName),
            t.dim("old per-lang format —"),
            t.yellow("--force"),
            t.dim("or delete output")
          );
        } else {
          outRecalls = mergePrevOutRecalls(prev.recalls, recalls);
          const saved = prev.meta?.i18nProgressByLang || {};
          for (const L of TARGET_LANGS_NON_EN) {
            progressByLang[L] = Math.min(N, saved[L] ?? 0);
          }
          if (isProgressComplete(progressByLang, N, langs)) {
            console.log(
              tag("SKIP", t.gray),
              t.dim(fileName),
              t.green("✓"),
              t.dim(`${N} recalls · all requested locales done`),
              t.dim("(--force to redo)")
            );
            continue;
          }
          const bar = langs
            .map((L) => `${langPaint(L)}${t.dim(":")}${progressByLang[L]}/${N}`)
            .join(t.dim(" · "));
          console.log(tag("RESUME", t.yellow), t.bold(t.white(fileName)), bar);
        }
      } catch {
        outRecalls = initOutRecallsFromSource(recalls);
      }
    }

    console.log();
    console.log(
      t.bold(t.cyan("▸")),
      t.bold(t.white(fileName)),
      t.dim("·"),
      t.dim(`${N} recalls`),
      t.dim("·"),
      t.dim("en +"),
      t.dim(String(TARGET_LANGS_NON_EN.length)),
      t.dim("locales")
    );

    let limitLeft = flags.limit != null ? flags.limit : Infinity;

    for (const lang of langs) {
      const languageName = LANG_NAMES[lang];
      let startIndex = progressByLang[lang] || 0;
      if (startIndex >= N) {
        console.log(
          "  ",
          tag("OK", t.green),
          langPaint(lang),
          t.dim(languageName),
          t.dim("—"),
          t.dim(`complete (${N} recalls)`)
        );
        continue;
      }

      const startBar = formatLocaleProgressBar(startIndex, N);
      console.log(
        "  ",
        t.dim("┌"),
        langPaint(lang),
        t.dim("·"),
        t.white(languageName),
        t.green(startBar.barStr),
        t.cyan(`${startBar.pct}%`),
        t.dim(`${startIndex}/${N}`),
        t.dim("done ·"),
        t.dim(`next ${startIndex + 1}–${N}`)
      );

      let i = startIndex;
      let ranAnyBatch = false;
      while (i < N && limitLeft > 0) {
        ranAnyBatch = true;
        const batchSize = Math.min(concurrency, N - i, limitLeft);
        const batchIndices = [];
        for (let b = 0; b < batchSize; b++) batchIndices.push(i + b);

        const results = await Promise.all(
          batchIndices.map(async (idx) => {
            const r = recalls[idx];
            const payload = recallToPayload(r);
            try {
              const { data: translatedPayload, usage } = await translatePayload(
                payload,
                lang,
                languageName
              );
              apiCalls++;
              return { idx, translatedPayload, r, err: null, usage };
            } catch (e) {
              return { idx, translatedPayload: payload, r, err: e, usage: null };
            }
          })
        );

        let batchPrompt = 0;
        let batchCompletion = 0;
        let batchTotal = 0;

        for (const { idx, translatedPayload, r, err, usage } of results) {
          outRecalls[idx].languages[lang] = wrapLanguageBlock(lang, translatedPayload);
          if (err) {
            console.error(
              "    ",
              tag("ERR", t.red),
              langPaint(lang),
              t.dim(`${idx + 1}/${N}`),
              t.white(String(r.RecallNumber ?? idx)),
              t.red(err.message)
            );
          } else if (usage) {
            batchPrompt += usage.prompt_tokens;
            batchCompletion += usage.completion_tokens;
            batchTotal += usage.total_tokens;
            tokenPromptTotal += usage.prompt_tokens;
            tokenCompletionTotal += usage.completion_tokens;
            tokenGrandTotal += usage.total_tokens;
            appendTokenLog({
              ts: new Date().toISOString(),
              model: MODEL,
              fileName,
              lang,
              recallIndex: idx,
              recallNumber: r.RecallNumber ?? null,
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
            });
          }
        }

        const ids = results.map(
          ({ r, idx }) => t.dim("#") + t.white(String(r.RecallNumber ?? idx + 1))
        );
        console.log("    ", t.dim("·"), ids.join(t.dim(" ")));

        const lastIdx = batchIndices[batchIndices.length - 1];
        progressByLang[lang] = lastIdx + 1;
        i = lastIdx + 1;
        limitLeft -= batchSize;

        const outDoc = {
          meta: buildMeta(raw, fileName, progressByLang, N, langs),
          recalls: outRecalls,
        };
        fs.writeFileSync(outPath, JSON.stringify(outDoc, null, 2), "utf8");
        const doneBar = formatLocaleProgressBar(lastIdx + 1, N);
        console.log(
          "    ",
          tag("SAVE", t.green),
          t.dim("batch"),
          t.cyan(`${batchIndices[0] + 1}–${lastIdx + 1}`),
          t.dim("/"),
          t.white(String(N)),
          t.dim("·"),
          t.green(doneBar.barStr),
          t.cyan(`${doneBar.pct}%`),
          t.magenta(`×${batchSize}`),
          t.dim("·"),
          t.dim("tok"),
          t.yellow(`${batchPrompt}`),
          t.dim("+"),
          t.yellow(`${batchCompletion}`),
          t.dim("="),
          t.bold(t.white(String(batchTotal)))
        );

        if (limitLeft <= 0 && i < N) {
          console.warn(
            "    ",
            tag("LIMIT", t.yellow),
            t.dim("stopped before"),
            langPaint(lang),
            t.yellow(`${i + 1}/${N}`),
            t.dim("— re-run to continue")
          );
          break;
        }
        if (batchDelayMs > 0) await sleep(batchDelayMs);
      }
      if (ranAnyBatch) {
        console.log("  ", t.dim("└"), langPaint(lang), t.green("✓"), t.dim("locale done"));
      }
    }
  }

  console.log();
  hr();
  const avgTok = apiCalls > 0 ? (tokenGrandTotal / apiCalls).toFixed(1) : "0";
  console.log(
    tag("DONE", t.green),
    t.bold(t.white(`${((Date.now() - t0) / 1000).toFixed(1)}s`)),
    t.dim("·"),
    t.dim("calls"),
    t.bold(t.cyan(String(apiCalls))),
    t.dim("·"),
    t.dim("tokens"),
    t.dim("in"),
    t.yellow(String(tokenPromptTotal)),
    t.dim("out"),
    t.yellow(String(tokenCompletionTotal)),
    t.dim("Σ"),
    t.bold(t.white(String(tokenGrandTotal))),
    t.dim("·"),
    t.dim("avg/call"),
    t.cyan(avgTok)
  );
  hr();
  console.log();
}

main().catch((e) => {
  console.error(t.red("Fatal:"), e);
  process.exit(1);
});
