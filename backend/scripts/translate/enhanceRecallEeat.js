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
const SCRIPT_VERSION = "eeat-v1";

const INPUT_PATH = path.join(SCRIPTS_ROOT, "recalls.json");
const OUTPUT_PATH_DEFAULT = path.join(SCRIPTS_ROOT, "recalls.eeat.json");

const LANG_META = {
  en: { name: "English", dir: "ltr", locale: "en-US" },
  zh: { name: "Chinese (Simplified)", dir: "ltr", locale: "zh-CN" },
  es: { name: "Spanish", dir: "ltr", locale: "es-ES" },
  ar: { name: "Arabic", dir: "rtl", locale: "ar" },
  hi: { name: "Hindi", dir: "ltr", locale: "hi-IN" },
  pt: { name: "Portuguese (Brazil)", dir: "ltr", locale: "pt-BR" },
  ru: { name: "Russian", dir: "ltr", locale: "ru-RU" },
  fr: { name: "French", dir: "ltr", locale: "fr-FR" },
  ja: { name: "Japanese", dir: "ltr", locale: "ja-JP" },
  de: { name: "German", dir: "ltr", locale: "de-DE" },
  vi: { name: "Vietnamese", dir: "ltr", locale: "vi-VN" },
};

const EEAT_COPY = {
  en: {
    sourceSubtitle: "Source and Verification",
    sourceText:
      "This page is based on the official recall notice published by the U.S. Food and Drug Administration (FDA). We use the FDA notice as the primary source for recall details, and we keep company contact or website information only as supporting context.",
    audienceSubtitle: "Who Should Pay Attention",
    audienceText:
      "This recall is most relevant to people who purchased, used, sold, distributed, or recommended this product. Check the product name, packaging details, and the official FDA notice before taking action.",
    fdaLink: "Read the official FDA notice here.",
    companyLink: "View the company website here.",
  },
  zh: {
    sourceSubtitle: "来源与核实",
    sourceText:
      "本页面基于美国食品药品监督管理局（FDA）发布的官方召回通知。我们以 FDA 通知作为召回详情的主要来源，公司联系方式或网站信息仅作为辅助参考。",
    audienceSubtitle: "哪些人需要重点关注",
    audienceText:
      "本次召回与购买、使用、销售、分销或推荐该产品的人最相关。在采取行动前，请核对产品名称、包装信息以及 FDA 官方通知。",
    fdaLink: "在此查看 FDA 官方通知。",
    companyLink: "在此查看公司网站。",
  },
  es: {
    sourceSubtitle: "Fuente y verificación",
    sourceText:
      "Esta página se basa en el aviso oficial de retiro publicado por la Administración de Alimentos y Medicamentos de EE. UU. (FDA). Usamos el aviso de la FDA como fuente principal de los detalles del retiro, y mantenemos la información de contacto o del sitio web de la empresa solo como contexto complementario.",
    audienceSubtitle: "Quién debe prestar atención",
    audienceText:
      "Este retiro es especialmente relevante para las personas que compraron, usaron, vendieron, distribuyeron o recomendaron este producto. Verifique el nombre del producto, los detalles del empaque y el aviso oficial de la FDA antes de actuar.",
    fdaLink: "Lea aquí el aviso oficial de la FDA.",
    companyLink: "Vea aquí el sitio web de la empresa.",
  },
  ar: {
    sourceSubtitle: "المصدر والتحقق",
    sourceText:
      "تعتمد هذه الصفحة على إشعار الاستدعاء الرسمي المنشور من إدارة الغذاء والدواء الأمريكية (FDA). نحن نستخدم إشعار FDA كمصدر أساسي لتفاصيل الاستدعاء، بينما نعرض معلومات الاتصال بالشركة أو موقعها الإلكتروني فقط كسياق داعم.",
    audienceSubtitle: "من الذي يجب أن ينتبه",
    audienceText:
      "هذا الاستدعاء يهم بشكل خاص الأشخاص الذين اشتروا هذا المنتج أو استخدموه أو باعوه أو وزعوه أو أوصوا به. تحقق من اسم المنتج وتفاصيل العبوة والإشعار الرسمي الصادر عن FDA قبل اتخاذ أي إجراء.",
    fdaLink: "اقرأ إشعار FDA الرسمي هنا.",
    companyLink: "اعرض موقع الشركة هنا.",
  },
  hi: {
    sourceSubtitle: "स्रोत और सत्यापन",
    sourceText:
      "यह पेज अमेरिकी खाद्य एवं औषधि प्रशासन (FDA) द्वारा प्रकाशित आधिकारिक रिकॉल नोटिस पर आधारित है। हम रिकॉल विवरण के लिए FDA नोटिस को मुख्य स्रोत मानते हैं, जबकि कंपनी की संपर्क या वेबसाइट जानकारी केवल सहायक संदर्भ के रूप में रखते हैं।",
    audienceSubtitle: "किसे ध्यान देना चाहिए",
    audienceText:
      "यह रिकॉल उन लोगों के लिए सबसे अधिक महत्वपूर्ण है जिन्होंने इस उत्पाद को खरीदा, इस्तेमाल किया, बेचा, वितरित किया या सुझाया है। कोई कार्रवाई करने से पहले उत्पाद का नाम, पैकेजिंग विवरण और FDA का आधिकारिक नोटिस जांचें।",
    fdaLink: "यहाँ FDA की आधिकारिक सूचना पढ़ें।",
    companyLink: "यहाँ कंपनी की वेबसाइट देखें।",
  },
  pt: {
    sourceSubtitle: "Fonte e verificação",
    sourceText:
      "Esta página é baseada no aviso oficial de recall publicado pela Food and Drug Administration (FDA) dos Estados Unidos. Usamos o aviso da FDA como fonte principal dos detalhes do recall, e mantemos informações de contato ou do site da empresa apenas como contexto de apoio.",
    audienceSubtitle: "Quem deve prestar atenção",
    audienceText:
      "Este recall é mais relevante para pessoas que compraram, usaram, venderam, distribuíram ou recomendaram este produto. Verifique o nome do produto, os detalhes da embalagem e o aviso oficial da FDA antes de agir.",
    fdaLink: "Leia aqui o aviso oficial da FDA.",
    companyLink: "Veja aqui o site da empresa.",
  },
  ru: {
    sourceSubtitle: "Источник и проверка",
    sourceText:
      "Эта страница основана на официальном уведомлении об отзыве, опубликованном Управлением по контролю за продуктами и лекарствами США (FDA). Мы используем уведомление FDA как основной источник сведений об отзыве, а контакты компании или ее сайт приводим только как дополнительную информацию.",
    audienceSubtitle: "Кому следует обратить внимание",
    audienceText:
      "Этот отзыв особенно важен для людей, которые покупали, использовали, продавали, распространяли или рекомендовали этот продукт. Перед тем как предпринимать действия, проверьте название продукта, данные на упаковке и официальное уведомление FDA.",
    fdaLink: "Прочитайте официальное уведомление FDA здесь.",
    companyLink: "Посмотрите сайт компании здесь.",
  },
  fr: {
    sourceSubtitle: "Source et vérification",
    sourceText:
      "Cette page est basée sur l’avis officiel de rappel publié par la Food and Drug Administration (FDA) des États-Unis. Nous utilisons l’avis de la FDA comme source principale pour les détails du rappel, et nous conservons les coordonnées ou le site web de l’entreprise uniquement comme contexte complémentaire.",
    audienceSubtitle: "Qui doit être attentif",
    audienceText:
      "Ce rappel concerne surtout les personnes qui ont acheté, utilisé, vendu, distribué ou recommandé ce produit. Vérifiez le nom du produit, les détails de l’emballage et l’avis officiel de la FDA avant d’agir.",
    fdaLink: "Lisez ici l’avis officiel de la FDA.",
    companyLink: "Consultez ici le site de l’entreprise.",
  },
  ja: {
    sourceSubtitle: "情報源と確認方法",
    sourceText:
      "このページは、米国食品医薬品局（FDA）が公表した公式リコール通知に基づいています。リコールの詳細は FDA 通知を主要な情報源としており、企業の連絡先やウェブサイト情報は補足情報として掲載しています。",
    audienceSubtitle: "注意すべき人",
    audienceText:
      "このリコールは、この製品を購入、使用、販売、流通、または推奨した人に特に関係します。対応する前に、製品名、包装情報、FDA の公式通知を確認してください。",
    fdaLink: "FDA の公式通知はこちらで確認できます。",
    companyLink: "会社のウェブサイトはこちらです。",
  },
  de: {
    sourceSubtitle: "Quelle und Verifizierung",
    sourceText:
      "Diese Seite basiert auf der offiziellen Rückrufmitteilung der US-amerikanischen Food and Drug Administration (FDA). Wir verwenden die FDA-Mitteilung als Hauptquelle für die Rückrufdetails; Kontakt- oder Website-Angaben des Unternehmens dienen nur als ergänzender Kontext.",
    audienceSubtitle: "Wer aufmerksam sein sollte",
    audienceText:
      "Dieser Rückruf ist besonders relevant für Personen, die dieses Produkt gekauft, verwendet, verkauft, verteilt oder empfohlen haben. Prüfen Sie den Produktnamen, die Verpackungsangaben und die offizielle FDA-Mitteilung, bevor Sie handeln.",
    fdaLink: "Lesen Sie hier die offizielle FDA-Mitteilung.",
    companyLink: "Sehen Sie hier die Website des Unternehmens.",
  },
  vi: {
    sourceSubtitle: "Nguồn và xác minh",
    sourceText:
      "Trang này dựa trên thông báo thu hồi chính thức do Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ (FDA) công bố. Chúng tôi sử dụng thông báo của FDA làm nguồn chính cho các chi tiết về thu hồi, còn thông tin liên hệ hoặc website của công ty chỉ được giữ như thông tin hỗ trợ.",
    audienceSubtitle: "Ai nên chú ý",
    audienceText:
      "Thông báo thu hồi này đặc biệt liên quan đến những người đã mua, sử dụng, bán, phân phối hoặc giới thiệu sản phẩm này. Hãy kiểm tra tên sản phẩm, chi tiết bao bì và thông báo chính thức của FDA trước khi hành động.",
    fdaLink: "Đọc thông báo chính thức của FDA tại đây.",
    companyLink: "Xem website của công ty tại đây.",
  },
};

function fmtElapsed(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFlag(name, fallback = "en") {
  return name?.flag || { en: "🇺🇸", zh: "🇨🇳", es: "🇪🇸", ar: "🇸🇦", hi: "🇮🇳", pt: "🇧🇷", ru: "🇷🇺", fr: "🇫🇷", ja: "🇯🇵", de: "🇩🇪", vi: "🇻🇳" }[fallback] || "🇺🇸";
}

function formatDateForLang(dateStr, langCode) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  try {
    return date.toLocaleDateString(LANG_META[langCode]?.locale || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
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

function isWeakTitle(title) {
  const t = String(title || "").trim().toLowerCase();
  return !t || t === "product recall" || t === "recall" || t === "company announcement";
}

function findSectionIndex(content, patterns) {
  if (!Array.isArray(content)) return -1;
  return content.findIndex((section) => {
    const subtitle = String(section?.subtitle || "").trim().toLowerCase();
    return patterns.some((pattern) => subtitle.includes(pattern));
  });
}

function buildAuthorityLinks(langCode, recall) {
  const copy = EEAT_COPY[langCode] || EEAT_COPY.en;
  const links = [];
  if (recall.sourceUrl) {
    links.push(
      `<a href="${recall.sourceUrl}" target="_blank" rel="noopener noreferrer">${copy.fdaLink}</a>`
    );
  }
  if (recall.companyWebsite) {
    links.push(
      `<a href="${recall.companyWebsite}" target="_blank" rel="noopener noreferrer">${copy.companyLink}</a>`
    );
  }
  return links;
}

function buildEeatSectionsForLang(recall, langCode, langObj) {
  const copy = EEAT_COPY[langCode] || EEAT_COPY.en;
  const product = langObj?.productDescription || recall.productDescription || "this product";
  const publishDate = formatDateForLang(recall.fdaPublishDate || recall.datePublished, langCode);

  const sourceTextByLang = {
    en: `${copy.sourceText} Official publication date: ${publishDate || "not provided"}.`,
    zh: `${copy.sourceText} 官方发布时间：${publishDate || "未提供"}。`,
    es: `${copy.sourceText} Fecha oficial de publicación: ${publishDate || "no indicada"}.`,
    ar: `${copy.sourceText} تاريخ النشر الرسمي: ${publishDate || "غير متوفر"}.`,
    hi: `${copy.sourceText} आधिकारिक प्रकाशन तिथि: ${publishDate || "उपलब्ध नहीं"}।`,
    pt: `${copy.sourceText} Data oficial de publicação: ${publishDate || "não informada"}.`,
    ru: `${copy.sourceText} Официальная дата публикации: ${publishDate || "не указана"}.`,
    fr: `${copy.sourceText} Date officielle de publication : ${publishDate || "non indiquée"}.`,
    ja: `${copy.sourceText} 公式掲載日: ${publishDate || "未記載"}。`,
    de: `${copy.sourceText} Offizielles Veröffentlichungsdatum: ${publishDate || "nicht angegeben"}.`,
    vi: `${copy.sourceText} Ngày công bố chính thức: ${publishDate || "không có"}.`,
  };

  const audienceTextByLang = {
    en: `${copy.audienceText} Product named in this notice: ${product}.`,
    zh: `${copy.audienceText} 本通知中提到的产品：${product}。`,
    es: `${copy.audienceText} Producto mencionado en este aviso: ${product}.`,
    ar: `${copy.audienceText} المنتج المذكور في هذا الإشعار: ${product}.`,
    hi: `${copy.audienceText} इस सूचना में उल्लिखित उत्पाद: ${product}।`,
    pt: `${copy.audienceText} Produto citado neste aviso: ${product}.`,
    ru: `${copy.audienceText} Продукт, указанный в этом уведомлении: ${product}.`,
    fr: `${copy.audienceText} Produit mentionné dans cet avis : ${product}.`,
    ja: `${copy.audienceText} この通知で言及されている製品: ${product}。`,
    de: `${copy.audienceText} In diesem Hinweis genanntes Produkt: ${product}.`,
    vi: `${copy.audienceText} Sản phẩm được nêu trong thông báo này: ${product}.`,
  };

  return [
    {
      subtitle: copy.sourceSubtitle,
      text: sourceTextByLang[langCode] || sourceTextByLang.en,
      authorityLinks: buildAuthorityLinks(langCode, recall),
    },
    {
      subtitle: copy.audienceSubtitle,
      text: audienceTextByLang[langCode] || audienceTextByLang.en,
      authorityLinks: [],
    },
  ];
}

async function callOpenAIJson(prompt, fallback) {
  if (!OPENAI_API_KEY) return fallback;
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
    if (!res.ok) return fallback;
    const data = await res.json();
    const text = (
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      ""
    ).trim();
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

async function translateText(text, langName) {
  if (!text || !OPENAI_API_KEY) return text;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          `Translate the following text into ${langName}.`,
          `Return only the translated text.`,
          `Keep product names, company names, FDA, URLs, and numbers unchanged unless a natural localized sentence requires grammar around them.`,
          text,
        ].join("\n"),
      }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return (
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      text
    ).trim();
  } catch {
    return text;
  }
}

async function improveEnglishMetadata(recall) {
  const english = recall.languages?.en || {};
  const fallback = {
    title:
      recall.companyName && recall.productDescription
        ? `${recall.companyName} Recall: ${recall.productDescription}`
        : recall.headline || recall.title || recall.productDescription || "Product Recall",
    headline:
      recall.headline && !isWeakTitle(recall.headline)
        ? recall.headline
        : recall.companyName && recall.reason
          ? `${recall.companyName} recall over ${recall.reason}`
          : recall.headline || recall.title || "Product Recall",
    description:
      english.description ||
      recall.description ||
      `${recall.companyName || "The company"} issued a recall for ${recall.productDescription || "a product"} because of ${recall.reason || "a reported safety issue"}.`,
  };

  const prompt = [
    "You improve English recall metadata for a public-safety recall website.",
    "Return strict JSON only with keys: title, headline, description.",
    "Goals:",
    "- Make the title specific and trustworthy.",
    "- Keep it factual and based only on provided recall facts.",
    "- Do not invent injuries, dates, or product details.",
    "- Description should be 1 sentence and under 190 characters if possible.",
    "",
    JSON.stringify({
      title: recall.title,
      headline: recall.headline,
      description: recall.description,
      companyName: recall.companyName,
      brandName: recall.brandName,
      productDescription: recall.productDescription,
      productType: recall.productType,
      reason: recall.reason,
      datePublished: recall.datePublished,
      sourceUrl: recall.sourceUrl,
      englishContent: english.content || recall.content || [],
    }),
  ].join("\n");

  return callOpenAIJson(prompt, fallback);
}

function applyLanguageDefaults(langCode, langObj) {
  const meta = LANG_META[langCode] || LANG_META.en;
  const out = clone(langObj || {});
  out.lang = langCode;
  out.dir = out.dir || meta.dir;
  out.flag = out.flag || getFlag(out, langCode);
  if (!Array.isArray(out.content)) out.content = [];
  return out;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  const opts = parseArgs();
  const source = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  if (!Array.isArray(source)) throw new Error("Input recalls file must be a JSON array.");

  let working = clone(source);
  if (opts.resume && fs.existsSync(opts.output)) {
    working = JSON.parse(fs.readFileSync(opts.output, "utf8"));
  }

  let records = working;
  if (opts.slug) records = working.filter((r) => r.slug === opts.slug);
  if (Number.isFinite(opts.limit) && opts.limit > 0) records = records.slice(0, opts.limit);

  console.log(`EEAT input:  ${opts.input}`);
  console.log(`EEAT output: ${opts.output}`);
  console.log(`Records:     ${records.length}`);
  console.log(`Model:       ${OPENAI_API_KEY ? MODEL : "OpenAI disabled"}`);

  let index = 0;
  const startedAt = Date.now();
  for (const recall of records) {
    index += 1;
    const allRecallsIndex = working.findIndex((r) => r.slug === recall.slug);
    if (allRecallsIndex < 0) continue;

    const current = working[allRecallsIndex];
    current.languages = current.languages && typeof current.languages === "object" ? current.languages : {};

    const hadWeakTitle = isWeakTitle(current.languages?.en?.title || current.title || current.headline);
    let englishMeta = null;
    const phase = hadWeakTitle ? "improve-title + eeat" : "eeat-sections";
    const elapsedMs = Date.now() - startedAt;
    const avgMs = index > 0 ? elapsedMs / index : 0;
    const etaMs = avgMs * Math.max(0, records.length - index);
    console.log(`[${index}/${records.length}] ${phase} | ${current.slug}`);
    console.log(`  elapsed: ${fmtElapsed(elapsedMs)} | eta: ${fmtElapsed(etaMs)} | output: ${path.basename(opts.output)}`);

    if (hadWeakTitle) {
      englishMeta = await improveEnglishMetadata(current);
      current.title = englishMeta.title || current.title;
      current.headline = englishMeta.headline || current.headline || current.title;
      current.description = englishMeta.description || current.description;
    }

    for (const langCode of Object.keys(LANG_META)) {
      const langObj = applyLanguageDefaults(langCode, current.languages[langCode]);

      if (langCode === "en") {
        langObj.title = (englishMeta?.title || langObj.title || current.title || "").trim();
        langObj.description = (englishMeta?.description || langObj.description || current.description || "").trim();
        langObj.headline = (englishMeta?.headline || langObj.headline || current.headline || langObj.title || "").trim();
      } else if (englishMeta) {
        langObj.title = await translateText(englishMeta.title, LANG_META[langCode].name);
        langObj.description = await translateText(englishMeta.description, LANG_META[langCode].name);
        langObj.headline = await translateText(englishMeta.headline, LANG_META[langCode].name);
        await sleep(50);
      }

      const eeatSections = buildEeatSectionsForLang(current, langCode, langObj);
      const content = Array.isArray(langObj.content) ? langObj.content.slice() : [];

      if (findSectionIndex(content, ["source and verification", "source et vérification", "source y verificación", "المصدر والتحقق", "nguồn và xác minh", "quelle und verifizierung", "источник и проверка", "情報源と確認方法", "स्रोत और सत्यापन"]) === -1) {
        content.push(eeatSections[0]);
      }
      if (findSectionIndex(content, ["who should pay attention", "quién debe prestar atención", "من الذي يجب أن ينتبه", "ai nên chú ý", "wer aufmerksam sein sollte", "qui doit être attentif", "誰が注意すべきか", "किसे ध्यान देना चाहिए", "quem deve prestar atenção", "кому следует обратить внимание"]) === -1) {
        content.push(eeatSections[1]);
      }

      langObj.content = content;
      current.languages[langCode] = langObj;
    }

    current.content = current.languages.en?.content || current.content || [];
    current.translatedAt = current.translatedAt || new Date().toISOString();
    current.eeatMeta = {
      version: SCRIPT_VERSION,
      enhancedAt: new Date().toISOString(),
      outputFile: path.basename(opts.output),
      improvedEnglishTitle: hadWeakTitle,
      addedSections: ["source-and-verification", "who-should-pay-attention"],
    };

    writeJson(opts.output, working);
    console.log(`  saved: ${current.slug}`);
  }

  console.log(`Done. Wrote EEAT copy to ${opts.output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
