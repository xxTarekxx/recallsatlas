"use strict";

const fs = require("fs");
const path = require("path");

const SCRIPTS_ROOT = path.join(__dirname, "..");
const BACKEND_ROOT = path.join(SCRIPTS_ROOT, "..");

try {
  require("dotenv").config({
    path: fs.existsSync(path.join(SCRIPTS_ROOT, ".env"))
      ? path.join(SCRIPTS_ROOT, ".env")
      : path.join(BACKEND_ROOT, ".env"),
  });
} catch {}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_EEAT_MODEL || "gpt-4.1-mini";
const SCRIPT_VERSION = "v2";

const INPUT_PATH = path.join(SCRIPTS_ROOT, "recalls.json");
const OUTPUT_PATH_DEFAULT = path.join(SCRIPTS_ROOT, "recalls.eeat.json");

const LANG_META = {
  en: { name: "English", dir: "ltr" },
  zh: { name: "Chinese (Simplified)", dir: "ltr" },
  es: { name: "Spanish", dir: "ltr" },
  ar: { name: "Arabic", dir: "rtl" },
  hi: { name: "Hindi", dir: "ltr" },
  pt: { name: "Portuguese (Brazil)", dir: "ltr" },
  ru: { name: "Russian", dir: "ltr" },
  fr: { name: "French", dir: "ltr" },
  ja: { name: "Japanese", dir: "ltr" },
  de: { name: "German", dir: "ltr" },
  vi: { name: "Vietnamese", dir: "ltr" },
};

const PRODUCT_CONTEXT = {
  cosmetics: "consumers, salons, beauty professionals, and retailers who may still have this cosmetic product in use or in stock",
  drugs: "patients, caregivers, pharmacists, clinics, and healthcare teams who may still have this drug product available",
  food: "consumers, households, grocery stores, restaurants, and food-service operators who may still have this product in storage",
  dietary: "consumers, supplement users, wellness retailers, and health practitioners who may still have this product available",
  devices: "patients, caregivers, clinicians, hospitals, and distributors who may still use or stock this device",
  vehicles: "drivers, vehicle owners, repair shops, dealers, and fleet managers responsible for affected vehicles or parts",
  generic: "consumers, distributors, retailers, and professionals who may still have this product in use or in stock",
};

const SECTION_TITLES = {
  en: {
    whatToDo: "What You Should Do",
    audience: "Who Should Pay Attention",
    source: "Source and Verification",
  },
  zh: {
    whatToDo: "你应该怎么做",
    audience: "谁应该特别留意",
    source: "来源与核实",
  },
  es: {
    whatToDo: "Qué debe hacer",
    audience: "Quién debe prestar atención",
    source: "Fuente y verificación",
  },
  ar: {
    whatToDo: "ما الذي ينبغي عليك فعله",
    audience: "من الذي يجب أن ينتبه",
    source: "المصدر والتحقق",
  },
  hi: {
    whatToDo: "आपको क्या करना चाहिए",
    audience: "किसे ध्यान देना चाहिए",
    source: "स्रोत और सत्यापन",
  },
  pt: {
    whatToDo: "O que você deve fazer",
    audience: "Quem deve prestar atenção",
    source: "Fonte e verificação",
  },
  ru: {
    whatToDo: "Что вам следует сделать",
    audience: "Кому следует обратить внимание",
    source: "Источник и проверка",
  },
  fr: {
    whatToDo: "Ce que vous devez faire",
    audience: "Qui doit être attentif",
    source: "Source et vérification",
  },
  ja: {
    whatToDo: "取るべき対応",
    audience: "注意すべき人",
    source: "情報源と確認",
  },
  de: {
    whatToDo: "Was Sie tun sollten",
    audience: "Wer aufmerksam sein sollte",
    source: "Quelle und Verifizierung",
  },
  vi: {
    whatToDo: "Bạn nên làm gì",
    audience: "Ai nên chú ý",
    source: "Nguồn và xác minh",
  },
};

let interrupted = false;

function fmtElapsed(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

function parseArgs() {
  const flags = process.argv.slice(2);
  const out = {
    input: INPUT_PATH,
    output: OUTPUT_PATH_DEFAULT,
    resume: flags.includes("--resume"),
    limit: null,
    slug: null,
  };
  for (const flag of flags) {
    if (flag.startsWith("--input=")) out.input = path.resolve(flag.slice(8));
    if (flag.startsWith("--output=")) out.output = path.resolve(flag.slice(9));
    if (flag.startsWith("--limit=")) out.limit = Number(flag.slice(8));
    if (flag.startsWith("--slug=")) out.slug = flag.slice(7).trim();
  }
  return out;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function stripCodeFences(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function recallNeedsEnhancement(recall) {
  return String(recall?.eeatMeta?.version || "") !== SCRIPT_VERSION;
}

function normalizeString(value, fallback = "Unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function findSectionIndex(content, subtitle) {
  if (!Array.isArray(content)) return -1;
  const needle = String(subtitle || "").trim().toLowerCase();
  return content.findIndex(
    (section) => String(section?.subtitle || "").trim().toLowerCase() === needle
  );
}

function upsertSection(content, subtitle, section) {
  const out = Array.isArray(content) ? content.slice() : [];
  const idx = findSectionIndex(out, subtitle);
  if (idx === -1) {
    out.push(section);
  } else {
    out[idx] = {
      ...out[idx],
      ...section,
      subtitle: out[idx].subtitle || section.subtitle,
    };
  }
  return out;
}

function detectAuthority(recall) {
  const source = String(recall?.sourceUrl || "").toLowerCase();
  if (source.includes("nhtsa")) return "NHTSA";
  if (source.includes("fda.gov")) return "FDA";
  const regulated = String(recall?.regulatedProducts || "").toLowerCase();
  if (regulated.includes("vehicle")) return "NHTSA";
  return "FDA";
}

function detectProductContextKey(recall) {
  const regulated = String(recall?.regulatedProducts || "").toLowerCase();
  const productType = String(recall?.productType || "").toLowerCase();
  const haystack = `${regulated} ${productType}`;
  if (haystack.includes("cosmetic")) return "cosmetics";
  if (haystack.includes("drug")) return "drugs";
  if (haystack.includes("food")) return "food";
  if (haystack.includes("dietary")) return "dietary";
  if (haystack.includes("device")) return "devices";
  if (haystack.includes("vehicle")) return "vehicles";
  return "generic";
}

function buildAuthorityLinks(recall) {
  if (!recall?.sourceUrl) return [];
  const authority = detectAuthority(recall);
  return [
    `<a href="${recall.sourceUrl}" target="_blank" rel="noopener noreferrer">Review the official ${authority} notice.</a>`,
  ];
}

function buildFallbackMeta(recall) {
  const reason = normalizeString(recall?.reason);
  const productDescription = normalizeString(recall?.productDescription);
  const regulatedProducts = normalizeString(recall?.regulatedProducts);
  const companyName = normalizeString(recall?.companyName);
  const lowerReason = reason.toLowerCase();
  const contextKey = detectProductContextKey(recall);
  const contextText = PRODUCT_CONTEXT[contextKey] || PRODUCT_CONTEXT.generic;

  let riskLevel = "Unknown";
  if (reason !== "Unknown") {
    if (
      /(death|fatal|fire|burn|explosion|listeria|salmonella|e\. coli|contamination|sterility|choking|crash|brake|air bag|airbag|methylene chloride|chloroform|toxic|poison|carcinogen|cancer)/i.test(
        lowerReason
      )
    ) {
      riskLevel = "High";
    } else if (
      /(injury|cut|laceration|fall|fracture|chemical|mislabeled|undeclared|allergen|leak|failure|defect)/i.test(
        lowerReason
      )
    ) {
      riskLevel = "Medium";
    } else {
      riskLevel = "Low";
    }
  }

  let injuryRisk = "Unknown";
  if (reason !== "Unknown") {
    injuryRisk = /(injury|burn|cut|laceration|fall|fracture|choking|death|fatal|crash|shock)/i.test(
      lowerReason
    )
      ? "Yes"
      : "No";
  }

  return {
    recallStatus: "Unknown",
    riskLevel,
    injuryRisk,
    whatToDo: [
      `Check whether you have ${productDescription}.`,
      `Review the official recall notice before using, selling, or giving away the product.`,
      `Follow instructions from ${companyName} or the regulator if your product is affected.`,
    ],
    affectedPopulation: `People who bought, used, sold, distributed, or recommended ${productDescription} in the ${regulatedProducts} category.`,
    expertSummary: `${companyName} is linked to a recall involving ${productDescription}. The stated concern is ${reason}.`,
    riskExplanation:
      reason === "Unknown"
        ? `The published recall reason is not clearly stated in the available record for ${productDescription}.`
        : `The concern described in the recall is ${reason}. This determines the practical safety risk level shown here.`,
    realWorldContext: `This recall matters most to ${contextText}, especially if ${productDescription} may still be in use, storage, or distribution.`,
  };
}

function buildJsonPrompt(recall) {
  const languages = {};
  for (const [langCode, meta] of Object.entries(LANG_META)) {
    if (langCode === "en") continue;
    languages[langCode] = meta.name;
  }

  return [
    "You are generating a strict JSON EEAT layer for a recall record.",
    "Use only the provided recall fields.",
    "Do not invent facts, injuries, status details, contact steps, dates, or regulatory findings.",
    "If a fact is not supported, return \"Unknown\".",
    "Use plain English for the main fields.",
    "You must produce naturally translated output for every requested non-English language field.",
    "Do not leave translated fields in English unless the text is a product name, company name, regulator name, or technical term that should stay unchanged.",
    "Return strict JSON only.",
    "The JSON must use this exact top-level shape:",
    "{",
    '  "recallStatus": "Ongoing | Terminated | Unknown",',
    '  "riskLevel": "High | Medium | Low | Unknown",',
    '  "injuryRisk": "Yes | No | Unknown",',
    '  "whatToDo": ["...", "...", "..."],',
    '  "affectedPopulation": "...",',
    '  "expertSummary": "...",',
    '  "riskExplanation": "...",',
    '  "realWorldContext": "...",',
    '  "translations": {',
    '    "zh": {',
    '      "affectedPopulation": "...",',
    '      "expertSummary": "...",',
    '      "riskExplanation": "...",',
    '      "realWorldContext": "...",',
    '      "whatToDo": ["...", "...", "..."]',
    "    }",
    "  }",
    "}",
    "Translation rules:",
    "- Translate only affectedPopulation, expertSummary, riskExplanation, realWorldContext, and whatToDo.",
    "- Keep product names, company names, FDA, NHTSA, and technical terms unchanged when appropriate.",
    "- Preserve a safety-focused, plain-language tone.",
    "",
    JSON.stringify({
      companyName: recall?.companyName || "",
      productDescription: recall?.productDescription || "",
      regulatedProducts: recall?.regulatedProducts || "",
      reason: recall?.reason || "",
      languages,
    }),
  ].join("\n");
}

async function callOpenAIJson(prompt, fallback) {
  if (!OPENAI_API_KEY) return { value: fallback, status: "fallback:no-api-key" };
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        value: fallback,
        status: `fallback:http-${res.status}`,
        details: body.slice(0, 500),
      };
    }
    const data = await res.json();
    const text = (
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      ""
    ).trim();
    if (!text) {
      return {
        value: fallback,
        status: "fallback:empty-response",
        details: JSON.stringify(data).slice(0, 500),
      };
    }
    return { value: JSON.parse(stripCodeFences(text)), status: "openai:ok", details: "" };
  } catch (err) {
    return {
      value: fallback,
      status: "fallback:parse-or-network",
      details: String(err && err.stack ? err.stack : err || "").slice(0, 500),
    };
  }
}

async function generateRecallEeat(recall) {
  const baseFallback = buildFallbackMeta(recall);
  const fallback = {
    ...baseFallback,
    translations: Object.fromEntries(
      Object.keys(LANG_META)
        .filter((langCode) => langCode !== "en")
        .map((langCode) => [
          langCode,
          {
            affectedPopulation: baseFallback.affectedPopulation,
            expertSummary: baseFallback.expertSummary,
            riskExplanation: baseFallback.riskExplanation,
            realWorldContext: baseFallback.realWorldContext,
            whatToDo: baseFallback.whatToDo,
          },
        ])
    ),
  };

  const result = await callOpenAIJson(buildJsonPrompt(recall), fallback);
  const raw = result.value;
  const translatedEnough = Object.keys(LANG_META)
    .filter((langCode) => langCode !== "en")
    .every((langCode) => {
      const t = raw?.translations?.[langCode];
      return t &&
        normalizeString(t.affectedPopulation) !== fallback.affectedPopulation &&
        normalizeString(t.expertSummary) !== fallback.expertSummary &&
        normalizeString(t.riskExplanation) !== fallback.riskExplanation &&
        normalizeString(t.realWorldContext) !== fallback.realWorldContext &&
        normalizeStringArray(t.whatToDo).length > 0;
    });

  const status =
    result.status === "openai:ok" && !translatedEnough
      ? "fallback:missing-translations"
      : result.status;

  return {
    status,
    details: result.details || "",
    recallStatus: normalizeString(raw?.recallStatus),
    riskLevel: normalizeString(raw?.riskLevel),
    injuryRisk: normalizeString(raw?.injuryRisk),
    whatToDo: normalizeStringArray(raw?.whatToDo).length
      ? normalizeStringArray(raw?.whatToDo)
      : fallback.whatToDo,
    affectedPopulation: normalizeString(raw?.affectedPopulation),
    expertSummary: normalizeString(raw?.expertSummary),
    riskExplanation: normalizeString(raw?.riskExplanation),
    realWorldContext: normalizeString(raw?.realWorldContext),
    translations: raw?.translations && typeof raw.translations === "object"
      ? raw.translations
      : fallback.translations,
  };
}

function ensureLanguageContent(recall, langCode) {
  if (!recall.languages || typeof recall.languages !== "object") {
    recall.languages = {};
  }
  if (!recall.languages[langCode] || typeof recall.languages[langCode] !== "object") {
    recall.languages[langCode] = {
      content: [],
      dir: LANG_META[langCode]?.dir || "ltr",
      lang: langCode,
    };
  }
  if (!Array.isArray(recall.languages[langCode].content)) {
    recall.languages[langCode].content = [];
  }
  if (!recall.languages[langCode].dir) {
    recall.languages[langCode].dir = LANG_META[langCode]?.dir || "ltr";
  }
  if (!recall.languages[langCode].lang) {
    recall.languages[langCode].lang = langCode;
  }
  return recall.languages[langCode];
}

function buildWhatToDoSection(langCode, steps) {
  const subtitle = (SECTION_TITLES[langCode] || SECTION_TITLES.en).whatToDo;
  const safeSteps = normalizeStringArray(steps).slice(0, 3);
  const list = safeSteps.map((step) => `<li>${step}</li>`).join("");
  return {
    subtitle,
    text: `<ul>${list}</ul>`,
    authorityLinks: [],
  };
}

function buildAudienceSection(langCode, eeat) {
  const subtitle = (SECTION_TITLES[langCode] || SECTION_TITLES.en).audience;
  const parts = [
    normalizeString(eeat.affectedPopulation),
    normalizeString(eeat.realWorldContext),
  ].filter((part) => part !== "Unknown");
  return {
    subtitle,
    text: parts.join(" "),
    authorityLinks: [],
  };
}

function buildSourceSection(recall, langCode, eeat) {
  const subtitle = (SECTION_TITLES[langCode] || SECTION_TITLES.en).source;
  const authority = detectAuthority(recall);
  const summary = normalizeString(eeat.expertSummary);
  const explanation = normalizeString(eeat.riskExplanation);
  const sourceLeadByLang = {
    en: `This summary references the official ${authority} recall notice linked in this record.`,
    zh: `本摘要引用了此记录中链接的官方 ${authority} 召回通知。`,
    es: `Este resumen hace referencia al aviso oficial de retiro de ${authority} enlazado en este registro.`,
    ar: `يشير هذا الملخص إلى إشعار الاستدعاء الرسمي من ${authority} المرتبط في هذا السجل.`,
    hi: `यह सारांश इस रिकॉर्ड में लिंक किए गए आधिकारिक ${authority} रिकॉल नोटिस का संदर्भ देता है।`,
    pt: `Este resumo faz referência ao aviso oficial de recall da ${authority} vinculado neste registro.`,
    ru: `Это резюме ссылается на официальное уведомление об отзыве ${authority}, указанное в этой записи.`,
    fr: `Ce résumé renvoie à l'avis officiel de rappel de la ${authority} lié dans cet enregistrement.`,
    ja: `この要約は、この記録にリンクされている ${authority} の公式リコール通知を参照しています。`,
    de: `Diese Zusammenfassung verweist auf die in diesem Eintrag verlinkte offizielle ${authority}-Rückrufmitteilung.`,
    vi: `Bản tóm tắt này tham chiếu thông báo thu hồi chính thức của ${authority} được liên kết trong bản ghi này.`,
  };
  const sourceUrlTextByLang = {
    en: recall.sourceUrl
      ? "Use the source URL already attached to this recall to verify the official notice."
      : "The official source URL is not available in this record.",
    zh: recall.sourceUrl
      ? "请使用此召回记录中已有的 sourceUrl 来核实官方通知。"
      : "此记录中没有可用的官方 sourceUrl。",
    es: recall.sourceUrl
      ? "Use la sourceUrl ya incluida en este retiro para verificar el aviso oficial."
      : "No hay una sourceUrl oficial disponible en este registro.",
    ar: recall.sourceUrl
      ? "استخدم قيمة sourceUrl الموجودة بالفعل في هذا الاستدعاء للتحقق من الإشعار الرسمي."
      : "لا تتوفر قيمة sourceUrl الرسمية في هذا السجل.",
    hi: recall.sourceUrl
      ? "आधिकारिक सूचना की पुष्टि के लिए इस रिकॉल में पहले से मौजूद sourceUrl का उपयोग करें।"
      : "इस रिकॉर्ड में आधिकारिक sourceUrl उपलब्ध नहीं है।",
    pt: recall.sourceUrl
      ? "Use a sourceUrl já anexada a este recall para verificar o aviso oficial."
      : "Não há sourceUrl oficial disponível neste registro.",
    ru: recall.sourceUrl
      ? "Используйте уже указанную в этом отзыве sourceUrl для проверки официального уведомления."
      : "В этой записи нет официальной sourceUrl.",
    fr: recall.sourceUrl
      ? "Utilisez la sourceUrl déjà associée à ce rappel pour vérifier l'avis officiel."
      : "Aucune sourceUrl officielle n'est disponible dans cet enregistrement.",
    ja: recall.sourceUrl
      ? "公式通知の確認には、このリコール記録にすでに添付されている sourceUrl を使用してください。"
      : "この記録には公式 sourceUrl がありません。",
    de: recall.sourceUrl
      ? "Verwenden Sie die bereits an diesen Rückruf angehängte sourceUrl, um die offizielle Mitteilung zu prüfen."
      : "Für diesen Eintrag ist keine offizielle sourceUrl verfügbar.",
    vi: recall.sourceUrl
      ? "Hãy dùng sourceUrl đã gắn với thông báo thu hồi này để xác minh thông báo chính thức."
      : "Không có sourceUrl chính thức trong bản ghi này.",
  };
  const parts = [
    sourceLeadByLang[langCode] || sourceLeadByLang.en,
    summary !== "Unknown" ? summary : "",
    explanation !== "Unknown" ? explanation : "",
    sourceUrlTextByLang[langCode] || sourceUrlTextByLang.en,
  ].filter(Boolean);
  return {
    subtitle,
    text: parts.join(" "),
    authorityLinks: buildAuthorityLinks(recall),
  };
}

function appendSectionsToRecall(recall, eeatPayload) {
  if (!Array.isArray(recall.content)) {
    recall.content = [];
  }

  const topLevelSections = {
    whatToDo: buildWhatToDoSection("en", eeatPayload.whatToDo),
    audience: buildAudienceSection("en", eeatPayload),
    source: buildSourceSection(recall, "en", eeatPayload),
  };

  recall.content = upsertSection(
    recall.content,
    topLevelSections.whatToDo.subtitle,
    topLevelSections.whatToDo
  );
  recall.content = upsertSection(
    recall.content,
    topLevelSections.audience.subtitle,
    topLevelSections.audience
  );
  recall.content = upsertSection(
    recall.content,
    topLevelSections.source.subtitle,
    topLevelSections.source
  );

  for (const langCode of Object.keys(LANG_META)) {
    const langObj = ensureLanguageContent(recall, langCode);
    const translated = langCode === "en"
      ? eeatPayload
      : {
          affectedPopulation:
            normalizeString(eeatPayload.translations?.[langCode]?.affectedPopulation, eeatPayload.affectedPopulation),
          expertSummary:
            normalizeString(eeatPayload.translations?.[langCode]?.expertSummary, eeatPayload.expertSummary),
          riskExplanation:
            normalizeString(eeatPayload.translations?.[langCode]?.riskExplanation, eeatPayload.riskExplanation),
          realWorldContext:
            normalizeString(eeatPayload.translations?.[langCode]?.realWorldContext, eeatPayload.realWorldContext),
          whatToDo: normalizeStringArray(eeatPayload.translations?.[langCode]?.whatToDo).length
            ? normalizeStringArray(eeatPayload.translations[langCode].whatToDo)
            : eeatPayload.whatToDo,
        };

    const whatToDoSection = buildWhatToDoSection(langCode, translated.whatToDo);
    const audienceSection = buildAudienceSection(langCode, translated);
    const sourceSection = buildSourceSection(recall, langCode, translated);

    langObj.content = upsertSection(langObj.content, whatToDoSection.subtitle, whatToDoSection);
    langObj.content = upsertSection(langObj.content, audienceSection.subtitle, audienceSection);
    langObj.content = upsertSection(langObj.content, sourceSection.subtitle, sourceSection);
  }
}

async function main() {
  const opts = parseArgs();
  const source = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  if (!Array.isArray(source)) {
    throw new Error("Input recalls file must be a JSON array.");
  }

  let working = clone(source);
  if (opts.resume && fs.existsSync(opts.output)) {
    working = JSON.parse(fs.readFileSync(opts.output, "utf8"));
  }

  let records = working;
  if (opts.slug) records = working.filter((record) => record.slug === opts.slug);
  if (Number.isFinite(opts.limit) && opts.limit > 0) records = records.slice(0, opts.limit);

  const selectedSlugs = new Set(records.map((record) => record.slug));
  const writeSelectionOnly = Boolean(opts.slug) || (Number.isFinite(opts.limit) && opts.limit > 0);
  const saveOutput = () =>
    writeJson(
      opts.output,
      writeSelectionOnly
        ? working.filter((record) => selectedSlugs.has(record.slug))
        : working
    );
  const handleInterrupt = () => {
    interrupted = true;
    try {
      saveOutput();
      console.log(`Interrupted. Progress saved to ${opts.output}`);
    } catch (err) {
      console.error("Failed to save output during interrupt:", err);
    }
    process.exit(130);
  };

  process.once("SIGINT", handleInterrupt);
  process.once("SIGTERM", handleInterrupt);
  process.once("beforeExit", () => {
    try {
      saveOutput();
    } catch {}
  });

  if (opts.resume) records = records.filter((record) => recallNeedsEnhancement(record));

  console.log(`EEAT input:  ${opts.input}`);
  console.log(`EEAT output: ${opts.output}`);
  console.log(`Records:     ${records.length}`);
  console.log(`Model:       ${OPENAI_API_KEY ? MODEL : "OpenAI disabled"}`);

  let index = 0;
  const startedAt = Date.now();

  for (const recall of records) {
    index += 1;
    const workingIndex = working.findIndex((item) => item.slug === recall.slug);
    if (workingIndex < 0) continue;

    const current = working[workingIndex];
    if (opts.resume && !recallNeedsEnhancement(current)) {
      console.log(`[${index}/${records.length}] skip | ${current.slug}`);
      continue;
    }

    const elapsedMs = Date.now() - startedAt;
    const avgMs = index > 0 ? elapsedMs / index : 0;
    const etaMs = avgMs * Math.max(0, records.length - index);

    console.log(`[${index}/${records.length}] eeat-v2 | ${current.slug}`);
    console.log(
      `  elapsed: ${fmtElapsed(elapsedMs)} | eta: ${fmtElapsed(etaMs)} | output: ${path.basename(opts.output)}`
    );

    const eeatPayload = await generateRecallEeat(current);
    console.log(`  openai: ${eeatPayload.status}`);
    if (eeatPayload.details) {
      console.log(`  detail: ${eeatPayload.details}`);
    }

    current.eeatMeta = {
      version: SCRIPT_VERSION,
      lastVerified: new Date().toISOString(),
      recallStatus: normalizeString(eeatPayload.recallStatus),
      riskLevel: normalizeString(eeatPayload.riskLevel),
      injuryRisk: normalizeString(eeatPayload.injuryRisk),
      whatToDo: normalizeStringArray(eeatPayload.whatToDo).length
        ? normalizeStringArray(eeatPayload.whatToDo)
        : buildFallbackMeta(current).whatToDo,
      affectedPopulation: normalizeString(eeatPayload.affectedPopulation),
      expertSummary: normalizeString(eeatPayload.expertSummary),
      riskExplanation: normalizeString(eeatPayload.riskExplanation),
      realWorldContext: normalizeString(eeatPayload.realWorldContext),
    };

    appendSectionsToRecall(current, eeatPayload);

    saveOutput();
    console.log(`  saved: ${current.slug}`);
    if (interrupted) break;
  }

  saveOutput();
  console.log(`Done. Wrote EEAT copy to ${opts.output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
