"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const sharp = require("sharp");
const OpenAI = require("openai");

const PIPELINE_ROOT = path.join(__dirname, "..", "..");
const DATA_ROOT = path.join(PIPELINE_ROOT, "data");
const LOGS_ROOT = path.join(DATA_ROOT, "logs");
const BACKEND_ROOT = path.join(PIPELINE_ROOT, "..");
const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const ENV_ROOT = path.join(BACKEND_ROOT, "scripts");

require("dotenv").config({
    path: fs.existsSync(path.join(ENV_ROOT, ".env"))
        ? path.join(ENV_ROOT, ".env")
        : path.join(BACKEND_ROOT, ".env"),
});

const CPSC_API_URL = "https://www.saferproducts.gov/RestWebServices/Recall";
const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://recallsatlas.com";
const SITE_RECALLS_PATH = "/general-recalls";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = readOption("OPENAI_MODEL") || process.env.OPENAI_GENERAL_MODEL || "gpt-4.1-mini";

const JSON_PATH = path.join(DATA_ROOT, "general-recalls-en-eeat.json");
const HASH_PATH = path.join(LOGS_ROOT, "general-recalls-en-eeat.hashes.json");
const IMAGE_MAP_PATH = path.join(DATA_ROOT, "general-recalls-image-map.json");
const LOG_PATH = path.join(LOGS_ROOT, "general-recalls-log.txt");
const IMAGE_BASE_DIR = resolveImageBaseDir();

const MAX_RECORDS = readPositiveInt("MAX_RECORDS", 20);
const MAX_TOTAL = readPositiveInt("MAX_TOTAL", 20);
const SORT_ORDER_BASE = readPositiveInt("SORT_ORDER_BASE", 653);
const MIN_DELAY_MS = readPositiveInt("MIN_DELAY_MS", 1500);
const MAX_DELAY_MS = Math.max(MIN_DELAY_MS, readPositiveInt("MAX_DELAY_MS", 3000));
const IMAGE_MAX_WIDTH = readPositiveInt("IMAGE_MAX_WIDTH", 700);
const IMAGE_WEBP_QUALITY = readPositiveInt("IMAGE_WEBP_QUALITY", 80);
const MAX_SLUG_LENGTH = readPositiveInt("MAX_SLUG_LENGTH", 120);
const MAX_IMAGE_FOLDER_SLUG_LENGTH = readPositiveInt("MAX_IMAGE_FOLDER_SLUG_LENGTH", 72);
const MAX_RETRIES = 3;
const VERBOSE_LOGS = /^(1|true|yes)$/i.test(String(readOption("VERBOSE_LOGS") || ""));

ensureDirSync(DATA_ROOT);
ensureDirSync(LOGS_ROOT);
ensureDirSync(IMAGE_BASE_DIR);

if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in backend/scripts/.env or backend/.env");
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function readOption(name) {
    const cliName = `--${name.toLowerCase().replace(/_/g, "-")}=`;
    const cliValue = process.argv.find((arg) => arg.startsWith(cliName));
    if (cliValue) return cliValue.slice(cliName.length);
    return process.env[name];
}

function readPositiveInt(name, fallback) {
    const raw = readOption(name);
    if (raw == null || String(raw).trim() === "") return fallback;
    const value = Number.parseInt(String(raw), 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function todayISODate() {
    return new Date().toISOString().slice(0, 10);
}

function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function resolveImageBaseDir() {
    const raw = process.env.GENERAL_IMAGE_BASE_DIR || process.env.IMAGE_BASE_DIR;
    if (raw && String(raw).trim()) return path.resolve(String(raw).trim());
    return path.join(REPO_ROOT, "frontend", "public", "images", "generalRecalls");
}

function log(message) {
    const ts = new Date();
    const line = `[${ts.toISOString()}] ${message}`;
    console.log(`  ${ts.toTimeString().slice(0, 8)}  ${message}`);
    fs.appendFileSync(LOG_PATH, line + "\n");
}

function verboseLog(message) {
    if (VERBOSE_LOGS) log(message);
}

function rule(char = "=") {
    return char.repeat(Math.min(process.stdout.columns || 88, 88));
}

function block(lines, char = "=") {
    console.log("");
    console.log(rule(char));
    for (const line of lines) console.log(line);
    console.log(rule(char));
    fs.appendFileSync(LOG_PATH, lines.join("\n") + "\n");
}

function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/\u00a0/g, " ")
        .trim();
}

function truncate(value, max = 100) {
    const text = cleanText(value);
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomDelay(label = "") {
    const ms = randomInt(MIN_DELAY_MS, MAX_DELAY_MS);
    if (label) verboseLog(`Delay ${ms}ms -> ${label}`);
    await sleep(ms);
}

function safeReadJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, "utf8");
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeJson(filePath, data) {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function normalizeDate(value) {
    const text = cleanText(value);
    if (!text) return "";
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function normalizeDateTime(value) {
    const text = cleanText(value);
    if (!text) return "";
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
}

function normalizeSourceUrl(url) {
    const raw = cleanText(url);
    if (!raw) return "";
    try {
        const u = new URL(raw);
        u.hash = "";
        u.search = "";
        return u.toString().replace(/\/$/, "");
    } catch {
        return raw.replace(/[?#].*$/, "").replace(/\/$/, "");
    }
}

function hashValue(value) {
    return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function contentHash(record) {
    return hashValue(JSON.stringify(record));
}

function uniqueArray(values) {
    return [...new Set((values || []).filter(Boolean))];
}

function slugify(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-")
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, "");
}

function buildSlug(record) {
    const product = record.Products?.[0]?.Name || "";
    const title = record.Title || product || record.RecallNumber || record.RecallID || "general-recall";
    const base = slugify(title.replace(/\brecalled?\b/gi, "recall"));
    return base.endsWith("-recall") ? base : `${base}-recall`;
}

function buildImageFolderName(sortOrder, record, slug) {
    const product = record.Products?.[0]?.Name || "";
    const source = product || record.Title || slug || "general-recall";
    let shortSlug = slugify(source).slice(0, MAX_IMAGE_FOLDER_SLUG_LENGTH).replace(/-+$/g, "");
    if (!shortSlug) shortSlug = String(record.RecallNumber || record.RecallID || "general-recall");
    return `${sortOrder}-${shortSlug}`;
}

function ensureUniqueSlug(base, used) {
    let slug = base || "general-recall";
    let i = 2;
    while (used.has(slug)) {
        slug = `${base}-${i}`;
        i++;
    }
    used.add(slug);
    return slug;
}

function makeCanonicalUrl(slug) {
    return `${SITE_BASE_URL}${SITE_RECALLS_PATH}/${slug}`;
}

function parseArgs() {
    const args = process.argv.slice(2);
    const inputArg = args.find((arg) => arg.startsWith("--input="));
    const start = readOption("START") || readOption("RECALL_DATE_START") || "2023-12-07";
    const end = readOption("END") || readOption("RECALL_DATE_END") || todayISODate();
    return {
        input: inputArg ? path.resolve(inputArg.slice("--input=".length)) : "",
        start,
        end,
    };
}

async function fetchCpscRecalls({ start, end }) {
    const url = `${CPSC_API_URL}?format=json&RecallDateStart=${encodeURIComponent(start)}&RecallDateEnd=${encodeURIComponent(end)}`;
    log(`Fetching CPSC API: ${url}`);
    const response = await axios.get(url, {
        timeout: 120000,
        headers: {
            Accept: "application/json",
            "User-Agent": "RecallsAtlas/1.0 (+https://recallsatlas.com)",
        },
    });
    return Array.isArray(response.data) ? response.data : [];
}

function loadSourceRecords(args) {
    if (args.input) {
        log(`Loading local source JSON: ${args.input}`);
        const records = safeReadJson(args.input, []);
        return Promise.resolve(Array.isArray(records) ? records : []);
    }
    return fetchCpscRecalls(args);
}

function sourceIdentity(record) {
    return {
        recallId: record.RecallID || "",
        recallNumber: record.RecallNumber || "",
        sourceUrl: normalizeSourceUrl(record.URL || ""),
    };
}

function buildRecallHash(record) {
    const id = sourceIdentity(record);
    return hashValue(`${id.recallId}|${id.recallNumber}|${id.sourceUrl}`);
}

function sortNewestFirst(records) {
    return [...records].sort((a, b) => {
        const da = normalizeDateTime(a.RecallDate) || "";
        const db = normalizeDateTime(b.RecallDate) || "";
        if (da !== db) return db.localeCompare(da);
        return String(b.RecallID || "").localeCompare(String(a.RecallID || ""));
    });
}

function getRecordDate(record) {
    return normalizeDateTime(record.sourcePublishedAt || record.RecallDate || record.datePublished);
}

function createExistingIndexes(results, processedHashes) {
    const urls = new Set();
    const ids = new Set();
    const recallNumbers = new Set();
    const slugs = new Set();
    for (const item of results) {
        if (item.slug) slugs.add(item.slug);
        if (item.sourceUrl) urls.add(normalizeSourceUrl(item.sourceUrl));
        if (item.RecallID || item.recallId) ids.add(String(item.RecallID || item.recallId));
        if (item.RecallNumber || item.recallNumber) recallNumbers.add(String(item.RecallNumber || item.recallNumber));
        if (item._contentHash) processedHashes.add(String(item._contentHash));
    }
    return { urls, ids, recallNumbers, slugs };
}

function isExisting(record, indexes, processedHashes) {
    const id = sourceIdentity(record);
    const recallHash = buildRecallHash(record);
    return (
        (id.sourceUrl && indexes.urls.has(id.sourceUrl)) ||
        (id.recallId && indexes.ids.has(String(id.recallId))) ||
        (id.recallNumber && indexes.recallNumbers.has(String(id.recallNumber))) ||
        (recallHash && processedHashes.has(recallHash))
    );
}

function plainList(items, key = "Name") {
    return Array.isArray(items)
        ? items.map((item) => cleanText(item?.[key] || "")).filter(Boolean)
        : [];
}

function buildSourceFacts(record) {
    return {
        recallId: record.RecallID || "",
        recallNumber: record.RecallNumber || "",
        recallDate: record.RecallDate || "",
        lastPublishDate: record.LastPublishDate || "",
        title: record.Title || "",
        description: record.Description || "",
        url: record.URL || "",
        consumerContact: record.ConsumerContact || "",
        products: Array.isArray(record.Products) ? record.Products : [],
        hazards: plainList(record.Hazards),
        remedies: plainList(record.Remedies),
        remedyOptions: plainList(record.RemedyOptions, "Option"),
        injuries: plainList(record.Injuries),
        retailers: plainList(record.Retailers),
        importers: plainList(record.Importers),
        distributors: plainList(record.Distributors),
        manufacturers: plainList(record.Manufacturers),
        manufacturerCountries: plainList(record.ManufacturerCountries, "Country"),
        soldAtLabel: record.SoldAtLabel || "",
        extractedIdentifiers: Array.isArray(record.ExtractedIdentifiers) ? record.ExtractedIdentifiers : [],
        images: Array.isArray(record.Images) ? record.Images : [],
    };
}

function stripCodeFences(text) {
    return String(text || "")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function extractJsonObject(text) {
    const stripped = stripCodeFences(text);
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first < 0 || last <= first) return "";
    return stripped.slice(first, last + 1);
}

function parseOpenAIJson(text, fallback) {
    const json = extractJsonObject(text);
    if (!json) return fallback;
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

function cleanHtmlFragment(value) {
    return String(value || "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .trim();
}

function normalizeMetaDescription(value, fallback) {
    let text = cleanText(value || fallback || "");
    text = text.replace(/\s*\.\.\.$/, "").replace(/\s+…$/, "");
    if (text.length > 170) {
        text = text.slice(0, 167).replace(/\s+\S*$/, "").replace(/[,:;-]+$/g, "").trim();
    }
    if (text && !/[.!?]$/.test(text)) text += ".";
    return text;
}

function fallbackBrief(facts) {
    const product = facts.products?.[0]?.Name || "the affected product";
    const hazard = facts.hazards?.[0] || "the hazard described in the official recall notice";
    const company = facts.importers?.[0] || facts.distributors?.[0] || facts.manufacturers?.[0] || "The company";
    return {
        title: facts.title || `${product} recalled`,
        headline: facts.title || `${product} recalled`,
        metaDescription: normalizeMetaDescription(`${product} was recalled because ${hazard}. Check the official CPSC notice for product details and consumer instructions.`),
        quickAnswerHtml: `<p>${company} recalled ${product} because ${hazard}.</p>`,
        recallSummaryHtml: `<p>The U.S. Consumer Product Safety Commission posted a recall notice for ${product}. The notice identifies the hazard as ${hazard}.</p>`,
        riskOverviewHtml: `<p>The risk depends on whether a consumer has the affected product identified in the recall notice.</p>`,
        whoIsAffectedHtml: `<p>Consumers who purchased or use the recalled product should compare their product details with the official recall notice.</p>`,
        howToIdentifyProductHtml: `<p>Check the product name, model, labels, date information, and any identifiers listed in the recall notice.</p>`,
        whatToDoHtml: `<p>Follow the remedy instructions provided by the CPSC notice and the recalling firm.</p>`,
        sourceTransparencyHtml: `<p>This page is based on the official CPSC recall notice.</p>`,
        faq: [
            { question: "What product was recalled?", answer: product },
            { question: "Why was it recalled?", answer: hazard },
            { question: "Where can I verify this recall?", answer: "Use the official CPSC recall notice linked on this page." },
        ],
    };
}

async function generateEditorialBrief(facts) {
    const fallback = fallbackBrief(facts);
    const prompt = `
You create high-quality consumer product recall briefs for Recalls Atlas. Return STRICT JSON only.

Goal:
- Make the page substantially more useful than raw CPSC fields while staying fully grounded in SOURCE_JSON.
- Improve E-E-A-T through clear source attribution, practical identification guidance, risk context, and FAQ.

Hard rules:
- Use only SOURCE_JSON.
- Do not invent model numbers, dates, retailers, injury counts, states, quantities, URLs, or symptoms.
- Do not provide medical or legal advice.
- Do not create HTML tables unless SOURCE_JSON has exact structured rows; use lists instead.
- No placeholders like "unknown" or "N/A" unless exact source text says that.
- Simple HTML only: <p>, <ul>, <li>, <strong>.

Return exactly:
{
  "title": "",
  "headline": "",
  "metaDescription": "",
  "quickAnswerHtml": "",
  "recallSummaryHtml": "",
  "riskOverviewHtml": "",
  "whoIsAffectedHtml": "",
  "howToIdentifyProductHtml": "",
  "whatToDoHtml": "",
  "sourceTransparencyHtml": "",
  "faq": [
    { "question": "", "answer": "" },
    { "question": "", "answer": "" },
    { "question": "", "answer": "" }
  ]
}

Quality requirements:
- Target a useful 600-900 word page after facts/FAQ/sections are rendered.
- metaDescription: 140-165 characters, complete sentence, no trailing ellipsis.
- quickAnswerHtml: one concise paragraph.
- recallSummaryHtml: 2-3 paragraphs explaining product, hazard, units, dates, retailers, injury status if present.
- howToIdentifyProductHtml: explain exactly what label/model/product details to compare.
- whatToDoHtml: concrete steps based on source remedy/contact fields.
- riskOverviewHtml: explain the hazard in plain English without exaggeration.
- sourceTransparencyHtml: state that Recalls Atlas summarized the CPSC recall notice and link data is preserved separately.
- faq: 3-5 useful questions grounded in source facts.

SOURCE_JSON:
${JSON.stringify(facts)}
`.trim();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await openai.responses.create({
                model: MODEL,
                temperature: 0.2,
                input: prompt,
            });
            const parsed = parseOpenAIJson(response.output_text || "", fallback);
            const brief = { ...fallback, ...(parsed && typeof parsed === "object" ? parsed : {}) };
            return {
                title: cleanText(brief.title || fallback.title),
                headline: cleanText(brief.headline || fallback.headline),
                metaDescription: normalizeMetaDescription(brief.metaDescription, fallback.metaDescription),
                quickAnswerHtml: cleanHtmlFragment(brief.quickAnswerHtml || fallback.quickAnswerHtml),
                recallSummaryHtml: cleanHtmlFragment(brief.recallSummaryHtml || fallback.recallSummaryHtml),
                riskOverviewHtml: cleanHtmlFragment(brief.riskOverviewHtml || fallback.riskOverviewHtml),
                whoIsAffectedHtml: cleanHtmlFragment(brief.whoIsAffectedHtml || fallback.whoIsAffectedHtml),
                howToIdentifyProductHtml: cleanHtmlFragment(brief.howToIdentifyProductHtml || fallback.howToIdentifyProductHtml),
                whatToDoHtml: cleanHtmlFragment(brief.whatToDoHtml || fallback.whatToDoHtml),
                sourceTransparencyHtml: cleanHtmlFragment(brief.sourceTransparencyHtml || fallback.sourceTransparencyHtml),
                faq: (Array.isArray(brief.faq) ? brief.faq : fallback.faq)
                    .map((item) => ({
                        question: cleanText(item?.question || ""),
                        answer: cleanText(item?.answer || ""),
                    }))
                    .filter((item) => item.question && item.answer)
                    .slice(0, 5),
            };
        } catch (err) {
            log(`OpenAI failed attempt ${attempt}/${MAX_RETRIES}: ${err.message}`);
            if (attempt < MAX_RETRIES) await sleep(1500 * attempt);
        }
    }
    return fallback;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildFactsSection(facts) {
    return {
        recallNumber: facts.recallNumber,
        recallDate: normalizeDate(facts.recallDate),
        lastPublishDate: normalizeDate(facts.lastPublishDate),
        products: facts.products,
        hazards: facts.hazards,
        remedies: facts.remedies,
        remedyOptions: facts.remedyOptions,
        injuries: facts.injuries,
        retailers: facts.retailers,
        importers: facts.importers,
        distributors: facts.distributors,
        manufacturers: facts.manufacturers,
        manufacturerCountries: facts.manufacturerCountries,
        extractedIdentifiers: facts.extractedIdentifiers,
    };
}

function contactText(facts) {
    return cleanText(facts.consumerContact || "");
}

function buildContentSections({ facts, brief, authorityLinks }) {
    const sections = [
        { subtitle: "Quick Answer", text: brief.quickAnswerHtml },
        { subtitle: "Recall Summary", text: brief.recallSummaryHtml },
        { subtitle: "What Was Recalled", facts: buildFactsSection(facts) },
        { subtitle: "How to Identify the Recalled Product", text: brief.howToIdentifyProductHtml },
        { subtitle: "What Consumers Should Do", text: brief.whatToDoHtml },
        { subtitle: "Risk Overview", text: brief.riskOverviewHtml },
        { subtitle: "Who May Be Affected", text: brief.whoIsAffectedHtml },
    ];
    const contact = contactText(facts);
    if (contact) sections.push({ subtitle: "Company Contact Information", text: escapeHtml(contact) });
    if (brief.faq?.length) sections.push({ subtitle: "Frequently Asked Questions", faq: brief.faq });
    sections.push({
        subtitle: "Source and Verification",
        text: brief.sourceTransparencyHtml,
        authorityLinks,
    });
    return sections.filter((section) => section.text || section.facts || section.faq || section.authorityLinks);
}

function buildAuthorityLinks(facts) {
    const links = [];
    if (facts.url) {
        links.push(
            `Read the official CPSC recall notice <a href='${facts.url}' target='_blank' rel='noopener noreferrer'>on the CPSC website</a>.`
        );
    }
    return links;
}

function buildEeatMeta({ facts, fetchedAt }) {
    return {
        type: "source-based consumer product recall brief",
        editorialStandard:
            "CPSC recall facts are extracted from the official Recall Retrieval API; reader-facing explanations are generated from those facts and constrained not to invent new details.",
        factualBasis: "Official U.S. Consumer Product Safety Commission recall record.",
        officialSource: facts.url,
        sourceAuthority: "U.S. Consumer Product Safety Commission (CPSC)",
        sourcePublishedAt: normalizeDate(facts.recallDate),
        sourceFetchedAt: fetchedAt,
        lastVerifiedAt: fetchedAt,
        exactDataPreserved: [
            "CPSC source URL",
            "recall number",
            "recall date",
            "product details",
            "hazards",
            "remedies",
            "injury reports",
            "retailers",
            "company contact",
            "images",
        ],
        limitations:
            "This page is not independent product testing, medical advice, legal advice, or a human injury investigation.",
    };
}

async function downloadBuffer(url) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "User-Agent": "RecallsAtlas/1.0 (+https://recallsatlas.com)",
        },
    });
    return Buffer.from(response.data);
}

let imageFilenameIndexCache = null;

function indexExistingImages() {
    if (imageFilenameIndexCache) return imageFilenameIndexCache;
    imageFilenameIndexCache = new Map();
    if (!fs.existsSync(IMAGE_BASE_DIR)) return imageFilenameIndexCache;
    const stack = [IMAGE_BASE_DIR];
    while (stack.length) {
        const dir = stack.pop();
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile() && !imageFilenameIndexCache.has(entry.name)) imageFilenameIndexCache.set(entry.name, full);
        }
    }
    return imageFilenameIndexCache;
}

async function copyExistingImage(filename, outputPath) {
    const existing = indexExistingImages().get(filename);
    if (!existing || path.resolve(existing) === path.resolve(outputPath)) return false;
    await fs.promises.copyFile(existing, outputPath);
    imageFilenameIndexCache.set(filename, outputPath);
    return true;
}

async function processImage(image, folderName, imageMap) {
    const sourceUrl = cleanText(image?.URL || image?.SourceImageURL || "");
    if (!sourceUrl) return null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const recallDir = path.join(IMAGE_BASE_DIR, folderName);
            ensureDirSync(recallDir);
            if (imageMap[sourceUrl]) {
                const mapped = imageMap[sourceUrl];
                const mappedPath = path.join(recallDir, mapped);
                if (fs.existsSync(mappedPath) || (await copyExistingImage(mapped, mappedPath))) {
                    return `/images/generalRecalls/${folderName}/${mapped}`;
                }
            }
            const buffer = await downloadBuffer(sourceUrl);
            const filename = `${hashValue(buffer)}.webp`;
            const outputPath = path.join(recallDir, filename);
            if (!fs.existsSync(outputPath)) {
                if (!(await copyExistingImage(filename, outputPath))) {
                    await sharp(buffer)
                        .rotate()
                        .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true, fit: "inside" })
                        .webp({ quality: IMAGE_WEBP_QUALITY, effort: 6 })
                        .toFile(outputPath);
                }
            }
            imageFilenameIndexCache?.set(filename, outputPath);
            imageMap[sourceUrl] = filename;
            return `/images/generalRecalls/${folderName}/${filename}`;
        } catch (err) {
            log(`Image failed attempt ${attempt}/${MAX_RETRIES}: ${sourceUrl} -> ${err.message}`);
            if (attempt < MAX_RETRIES) await sleep(1000 * attempt);
        }
    }
    return null;
}

async function processImages(images, folderName, imageMap) {
    const saved = [];
    for (const image of images || []) {
        const localUrl = await processImage(image, folderName, imageMap);
        if (localUrl) {
            saved.push({
                URL: localUrl,
                Caption: cleanText(image?.Caption || ""),
                SourceImageURL: cleanText(image?.URL || image?.SourceImageURL || ""),
            });
        }
        await randomDelay("between images");
    }
    return saved;
}

function buildArticle({ record, facts, brief, slug, sortOrder, images, fetchedAt, recallHash }) {
    const canonicalUrl = makeCanonicalUrl(slug);
    const sourcePublishedAt = normalizeDate(facts.recallDate) || todayISODate();
    const authorityLinks = buildAuthorityLinks(facts);
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        schemaVersion: "general-recall-v1",
        id: slug,
        slug,
        _contentHash: recallHash,
        sortOrder,
        canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        headline: brief.headline,
        author: { "@type": "Organization", name: "Recalls Atlas", url: SITE_BASE_URL },
        publisher: {
            "@type": "Organization",
            name: "Recalls Atlas",
            logo: { "@type": "ImageObject", url: `${SITE_BASE_URL}/logo.png` },
        },
        datePublished: sourcePublishedAt,
        dateModified: todayISODate(),
        image: images[0]
            ? { "@type": "ImageObject", url: images[0].URL, caption: images[0].Caption || brief.headline }
            : undefined,
        description: brief.metaDescription,
        keywords: uniqueArray([
            "CPSC recall",
            facts.recallNumber ? `CPSC recall ${facts.recallNumber}` : "",
            facts.products?.[0]?.Name || "",
            ...facts.hazards,
            ...facts.remedyOptions,
        ]),
        content: buildContentSections({ facts, brief, authorityLinks }),
        sourceAuthority: "CPSC",
        sourceUrl: facts.url,
        sourcePublishedAt,
        sourceFetchedAt: fetchedAt,
        scrapedAt: fetchedAt,
        eeatMeta: buildEeatMeta({ facts, fetchedAt }),
        title: brief.title,
        editorialBrief: brief,
        RecallID: record.RecallID,
        RecallNumber: record.RecallNumber,
        RecallDate: record.RecallDate,
        LastPublishDate: record.LastPublishDate,
        URL: record.URL,
        Products: facts.products,
        Hazards: (facts.hazards || []).map((Name) => ({ Name })),
        Remedies: (facts.remedies || []).map((Name) => ({ Name })),
        RemedyOptions: (facts.remedyOptions || []).map((Option) => ({ Option })),
        Injuries: (facts.injuries || []).map((Name) => ({ Name })),
        Retailers: (facts.retailers || []).map((Name) => ({ Name })),
        Importers: (facts.importers || []).map((Name) => ({ Name })),
        Distributors: (facts.distributors || []).map((Name) => ({ Name })),
        Manufacturers: (facts.manufacturers || []).map((Name) => ({ Name })),
        ManufacturerCountries: (facts.manufacturerCountries || []).map((Country) => ({ Country })),
        ConsumerContact: facts.consumerContact,
        SoldAtLabel: facts.soldAtLabel,
        ExtractedIdentifiers: facts.extractedIdentifiers,
        Images: images,
        rawImageSources: facts.images,
        languages: {
            en: {
                Title: brief.title,
                Description: brief.recallSummaryHtml,
                ConsumerContact: facts.consumerContact,
                metaDescription: brief.metaDescription,
                Products: facts.products,
                Images: images.map((image) => ({ Caption: image.Caption || "" })),
                Injuries: (facts.injuries || []).map((Name) => ({ Name })),
                Retailers: (facts.retailers || []).map((Name) => ({ Name })),
                Importers: (facts.importers || []).map((Name) => ({ Name })),
                Distributors: (facts.distributors || []).map((Name) => ({ Name })),
                Manufacturers: (facts.manufacturers || []).map((Name) => ({ Name })),
                SoldAtLabel: facts.soldAtLabel,
                ManufacturerCountries: (facts.manufacturerCountries || []).map((Country) => ({ Country })),
                Hazards: (facts.hazards || []).map((Name) => ({ Name })),
                Remedies: (facts.remedies || []).map((Name) => ({ Name })),
                RemedyOptions: (facts.remedyOptions || []).map((Option) => ({ Option })),
                dir: "ltr",
                lang: "en",
            },
        },
    };
}

function saveAll(results, imageMap, processedHashes) {
    const sorted = [...results].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
    writeJson(JSON_PATH, sorted);
    writeJson(IMAGE_MAP_PATH, imageMap);
    writeJson(HASH_PATH, [...processedHashes].sort());
}

function assignSortOrders(pending, results) {
    const sortOrders = results.map((item) => item.sortOrder).filter((n) => typeof n === "number");
    const maxSort = sortOrders.length ? Math.max(...sortOrders) : SORT_ORDER_BASE;
    const minSort = sortOrders.length ? Math.min(...sortOrders) : SORT_ORDER_BASE + 1;
    const existingNewestDate = results.reduce((best, item) => {
        const d = getRecordDate(item);
        return d > best ? d : best;
    }, "");

    const fresh = [];
    const newer = [];
    const backfill = [];
    for (const item of pending) {
        if (!results.length) fresh.push(item);
        else if (getRecordDate(item.record) > existingNewestDate) newer.push(item);
        else backfill.push(item);
    }
    for (let i = 0; i < fresh.length; i++) fresh[i].sortOrder = SORT_ORDER_BASE - i;
    for (let i = 0; i < newer.length; i++) newer[i].sortOrder = maxSort + newer.length - i;
    for (let i = 0; i < backfill.length; i++) backfill[i].sortOrder = minSort - 1 - i;
}

async function main() {
    const args = parseArgs();
    const results = safeReadJson(JSON_PATH, []);
    const imageMap = safeReadJson(IMAGE_MAP_PATH, {});
    const storedHashes = safeReadJson(HASH_PATH, []);
    const processedHashes = new Set(Array.isArray(storedHashes) ? storedHashes : []);
    const indexes = createExistingIndexes(results, processedHashes);
    const remaining = Math.max(0, MAX_TOTAL - results.length);
    const runLimit = results.length >= MAX_TOTAL ? MAX_RECORDS : Math.min(MAX_RECORDS, remaining);

    block([
        "GENERAL RECALLS API PIPELINE",
        `Source          : ${args.input || "official CPSC API"}`,
        `Date range      : ${args.start} to ${args.end}`,
        `Output          : ${JSON_PATH}`,
        `Existing records: ${results.length}`,
        `Run target      : ${runLimit}`,
        `Sort base       : ${SORT_ORDER_BASE}`,
        `Image folder    : ${IMAGE_BASE_DIR}`,
    ]);

    if (runLimit <= 0) {
        log(`MAX_TOTAL reached (${results.length}/${MAX_TOTAL}); no records requested.`);
        return;
    }

    const sourceRecords = sortNewestFirst(await loadSourceRecords(args));
    log(`Source records loaded: ${sourceRecords.length}`);

    const pending = [];
    const queuedHashes = new Set();
    for (const record of sourceRecords) {
        if (pending.length >= runLimit) break;
        const recallHash = buildRecallHash(record);
        if (isExisting(record, indexes, processedHashes)) continue;
        if (queuedHashes.has(recallHash)) continue;
        pending.push({ record, recallHash });
        queuedHashes.add(recallHash);
    }

    if (!pending.length) {
        log("No new general recalls to process.");
        saveAll(results, imageMap, processedHashes);
        return;
    }

    assignSortOrders(pending, results);
    log(
        `Queued ${pending.length}: sortOrder ${Math.max(...pending.map((p) => p.sortOrder))} down to ${Math.min(...pending.map((p) => p.sortOrder))}`
    );

    for (let i = 0; i < pending.length; i++) {
        const { record, recallHash, sortOrder } = pending[i];
        const facts = buildSourceFacts(record);
        const baseSlug = buildSlug(record);
        const slug = ensureUniqueSlug(baseSlug, indexes.slugs);
        const folderName = buildImageFolderName(sortOrder, record, slug);

        block(
            [
                `RECALL ${i + 1}/${pending.length}`,
                `sortOrder : ${sortOrder}`,
                `recall no : ${record.RecallNumber || ""}`,
                `title     : ${truncate(record.Title, 110)}`,
                `source    : ${record.URL || ""}`,
                `folder    : ${folderName}`,
            ],
            "-"
        );

        const brief = await generateEditorialBrief(facts);
        await randomDelay("after editorial brief");
        const images = await processImages(facts.images, folderName, imageMap);
        const fetchedAt = new Date().toISOString();
        const article = buildArticle({ record, facts, brief, slug, sortOrder, images, fetchedAt, recallHash });
        article._contentHash = contentHash(article);

        results.push(article);
        processedHashes.add(recallHash);
        processedHashes.add(article._contentHash);
        indexes.urls.add(normalizeSourceUrl(record.URL || ""));
        if (record.RecallID) indexes.ids.add(String(record.RecallID));
        if (record.RecallNumber) indexes.recallNumbers.add(String(record.RecallNumber));

        saveAll(results, imageMap, processedHashes);
        block(
            [
                `SAVED ${i + 1}/${pending.length}`,
                `slug      : ${slug}`,
                `images    : ${images.length}`,
                `file total: ${results.length}`,
            ],
            "-"
        );
        await randomDelay("after recall");
    }

    saveAll(results, imageMap, processedHashes);
    log(`DONE. Saved ${pending.length}; total records ${results.length}.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
