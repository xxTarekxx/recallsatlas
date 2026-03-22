require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const axios = require("axios");
const sharp = require("sharp");
const crypto = require("crypto");
const OpenAI = require("openai");

// ======================================================
// CONFIG
// ======================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4.1-mini";

const FDA_BASE_URL = "https://www.fda.gov";
const FDA_LIST_URL =
    "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";

const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://recallsatlas.com";
const SITE_RECALLS_PATH = "/recalls";

// Scripts dir holds recalls.json, image-map.json, recalls-log.txt.
// IMAGE_BASE_DIR: set IMAGE_BASE_DIR in .env for server deployments.
//   Dev default:    <repo>/frontend/public/images/recalls
//   Server example: /var/www/html/recallsatlas/public/images/recalls
const IMAGE_BASE_DIR = process.env.IMAGE_BASE_DIR
    || path.resolve(__dirname, "..", "..", "frontend", "public", "images", "recalls");
const JSON_PATH = path.join(__dirname, "recalls.json");
const IMAGE_MAP_PATH = path.join(__dirname, "image-map.json");
const LOG_PATH = path.join(__dirname, "recalls-log.txt");

const START_SORT_ORDER = 1000;
const MAX_RECORDS = 100;
const MAX_RETRIES = 3;

const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 8000;

const NAV_TIMEOUT = 120000;
const IMAGE_TIMEOUT = 60000;

const IMAGE_MAX_WIDTH = 700;
const IMAGE_WEBP_QUALITY = 38;
const IMAGE_WEBP_EFFORT = 6;

const HEADLESS = false;

// ======================================================
// INIT
// ======================================================

if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
}

if (!fs.existsSync(IMAGE_BASE_DIR)) fs.mkdirSync(IMAGE_BASE_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ======================================================
// PROGRESS (terminal)
// ======================================================

const PROGRESS_BAR_WIDTH = 28;
const isTTY = process.stdout.isTTY && process.stderr.isTTY;

const progress = {
    phase: "Init",
    current: 0,
    total: MAX_RECORDS,
    status: "",
    _lastLine: "",
    clear() {
        if (!isTTY) return;
        process.stdout.write("\r" + " ".repeat(process.stdout.columns || 80) + "\r");
    },
    render() {
        if (!isTTY) return;
        const pct = this.total > 0 ? Math.min(1, this.current / this.total) : 0;
        const filled = Math.round(PROGRESS_BAR_WIDTH * pct);
        const bar = "█".repeat(filled) + "░".repeat(PROGRESS_BAR_WIDTH - filled);
        const status = this.status ? `  ${this.status.slice(0, 38)}` : "";
        const line = `  [${this.phase.padEnd(8)}] ${bar}  ${String(this.current).padStart(3)}/${this.total}${status}`;
        if (line !== this._lastLine) {
            process.stdout.write("\r" + line);
            this._lastLine = line;
        }
    },
    update({ phase, current, total, status } = {}) {
        if (phase !== undefined) this.phase = phase;
        if (current !== undefined) this.current = current;
        if (total !== undefined) this.total = total;
        if (status !== undefined) this.status = status;
        this.render();
    },
    finish(message = "Done") {
        if (!isTTY) return;
        this.clear();
        process.stdout.write(`  ${message}\n`);
    },
};

// ======================================================
// BASIC HELPERS
// ======================================================

function log(message) {
    const ts = new Date();
    const fileLine = `[${ts.toISOString()}] ${message}`;
    const timeShort = ts.toTimeString().slice(0, 8);
    const consoleLine = `  ${timeShort}  ${message}`;
    progress.clear();
    console.log(consoleLine);
    fs.appendFileSync(LOG_PATH, fileLine + "\n");
    progress.render();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomDelay(label = "") {
    const ms = randomInt(MIN_DELAY_MS, MAX_DELAY_MS);
    if (label) log(`Delay ${ms}ms → ${label}`);
    await sleep(ms);
}

function safeReadJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, "utf8");
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        log(`Failed reading JSON at ${filePath}: ${err.message}`);
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function saveAll(results, imageMap) {
    // Always write newest first (highest sortOrder at index 0)
    const sorted = [...results].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
    writeJson(JSON_PATH, sorted);
    writeJson(IMAGE_MAP_PATH, imageMap);
    log(`Progress saved. recalls=${results.length} imageMap=${Object.keys(imageMap).length}`);
}

process.on("SIGINT", () => {
    log("CTRL+C received. Exiting.");
    process.exit(0);
});

// ======================================================
// STRING / DATE HELPERS
// ======================================================

function cleanText(value) {
    return String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function stripHtml(html) {
    return cleanText(
        String(html || "")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
    );
}

function uniqueArray(arr) {
    return [...new Set((arr || []).map((v) => cleanText(v)).filter(Boolean))];
}

function normalizeDate(raw) {
    const v = cleanText(raw);
    if (!v) return "";

    if (/^\d{8}$/.test(v)) {
        return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
    }

    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return "";
}

function normalizeDateTime(raw) {
    const v = cleanText(raw);
    if (!v) return "";
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }
    return "";
}

function todayISODate() {
    return new Date().toISOString().slice(0, 10);
}

function nowISO() {
    return new Date().toISOString();
}

function extractYear(dateValue, fallback = "2026") {
    const v = cleanText(dateValue);
    const match = v.match(/\b(20\d{2})\b/);
    return match ? match[1] : fallback;
}

// ======================================================
// URL / QUALITY / EMPTY FIELD HELPERS
// ======================================================

function normalizeUrl(url) {
    let v = cleanText(url);
    if (!v) return "";

    v = v
        .replace(/\s+/g, "")
        .replace(/\bExternalLinkDisclaimer\b/gi, "")
        .replace(/[),.;]+$/g, "");

    if (/^mailto:/i.test(v)) return "";
    if (/^tel:/i.test(v)) return "";

    if (v.startsWith("//")) v = "https:" + v;
    if (v.startsWith("/")) v = FDA_BASE_URL + v;
    if (!/^https?:\/\//i.test(v) && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) {
        v = "https://" + v;
    }

    try {
        const u = new URL(v);
        u.hash = "";
        if (u.hostname.toLowerCase() === "www.fda.govmailto") return "";
        return u.toString().replace(/[?]$/, "");
    } catch {
        return "";
    }
}

function omitEmptyDeep(value) {
    if (Array.isArray(value)) {
        const cleaned = value
            .map((item) => omitEmptyDeep(item))
            .filter((item) => {
                if (item === null || item === undefined) return false;
                if (item === "") return false;
                if (Array.isArray(item) && item.length === 0) return false;
                if (typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0) {
                    return false;
                }
                return true;
            });
        return cleaned;
    }

    if (value && typeof value === "object") {
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            const cleaned = omitEmptyDeep(val);
            const isEmptyObject =
                cleaned &&
                typeof cleaned === "object" &&
                !Array.isArray(cleaned) &&
                Object.keys(cleaned).length === 0;
            const isEmptyArray = Array.isArray(cleaned) && cleaned.length === 0;

            if (
                cleaned === "" ||
                cleaned === null ||
                cleaned === undefined ||
                isEmptyObject ||
                isEmptyArray
            ) {
                continue;
            }

            out[key] = cleaned;
        }
        return out;
    }

    if (typeof value === "string") return cleanText(value);
    return value;
}

// ======================================================
// SLUG HELPERS
// ======================================================

function slugifyPart(str) {
    return cleanText(str)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/®|™|©/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function shortenTextWords(str, count) {
    return cleanText(str).split(" ").slice(0, count).join(" ");
}

function buildSlugBase({ brandName, companyName, productDescription, year }) {
    const productPart = slugifyPart(shortenTextWords(productDescription || "", 8));
    const brandPart = slugifyPart(shortenTextWords(brandName || companyName || "", 4));
    let base = [productPart, brandPart, "recall", year]
        .filter(Boolean)
        .join("-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    if (!base) base = `fda-recall-${year}`;
    if (base.length > 80) base = base.slice(0, 80).replace(/-+$/g, "");

    return base;
}

function ensureUniqueSlug(base, existingSlugs) {
    let candidate = base;
    let counter = 2;

    while (existingSlugs.has(candidate)) {
        candidate = `${base}-${counter}`;
        if (candidate.length > 90) {
            candidate = candidate.slice(0, 90).replace(/-+$/g, "");
        }
        counter++;
    }

    existingSlugs.add(candidate);
    return candidate;
}

// ======================================================
// HASH / IMAGE HELPERS
// ======================================================

function hashBuffer(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function downloadBuffer(url) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: IMAGE_TIMEOUT,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            Referer: FDA_BASE_URL + "/",
        },
    });

    return Buffer.from(response.data);
}

async function processImage(url, folderName, imageMap) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const recallDir = path.join(IMAGE_BASE_DIR, folderName);
            await ensureDir(recallDir);

            if (imageMap[url]) {
                const mappedFilename = imageMap[url];
                const mappedPath = path.join(recallDir, mappedFilename);
                if (fs.existsSync(mappedPath)) {
                    log(`Image cache hit (url map): ${url}`);
                    return `/images/recalls/${folderName}/${mappedFilename}`;
                }
            }

            const buffer = await downloadBuffer(url);
            const digest = hashBuffer(buffer);
            const filename = `${digest}.webp`;

            const outputPath = path.join(recallDir, filename);
            if (!fs.existsSync(outputPath)) {
                await sharp(buffer)
                    .rotate()
                    .resize({
                        width: IMAGE_MAX_WIDTH,
                        withoutEnlargement: true,
                        fit: "inside",
                    })
                    .webp({
                        quality: IMAGE_WEBP_QUALITY,
                        effort: IMAGE_WEBP_EFFORT,
                    })
                    .toFile(outputPath);

                log(`Saved image: ${folderName}/${filename}`);
            } else {
                log(`Image already exists: ${folderName}/${filename}`);
            }

            imageMap[url] = filename;
            return `/images/recalls/${folderName}/${filename}`;
        } catch (err) {
            log(`Image failed (attempt ${attempt}/${MAX_RETRIES}) ${url} → ${err.message}`);
            if (attempt < MAX_RETRIES) {
                await randomDelay("before image retry");
            }
        }
    }

    return null;
}

// ======================================================
// SEO / CONTENT HELPERS
// ======================================================

function makeCanonicalUrl(slug) {
    return `${SITE_BASE_URL}${SITE_RECALLS_PATH}/${slug}`;
}

function makeDescription({
    companyName,
    brandName,
    productDescription,
    reason,
    year,
}) {
    const entity = brandName || companyName || "A company";
    const product = productDescription || "a product";
    const because = reason ? ` after issues linked to ${reason.toLowerCase()}` : "";
    let text = `${entity} announced a recall involving ${product}${because}. FDA recall notice published in ${year}.`;
    text = cleanText(text);
    if (text.length > 160) {
        text = text.slice(0, 157).replace(/\s+\S*$/, "") + "...";
    }
    return text;
}

function makeKeywords({
    companyName,
    brandName,
    productDescription,
    productType,
    reason,
    regulatedProducts,
    year,
}) {
    const values = [
        "FDA recall",
        `${year} FDA recall`,
        companyName,
        brandName,
        productDescription,
        productType,
        reason,
        ...(regulatedProducts || []),
    ];

    return uniqueArray(values).slice(0, 15);
}

function buildPrimaryImageObject(images, headline) {
    if (!images || !images.length) return null;
    return omitEmptyDeep({
        "@type": "ImageObject",
        url: images[0] || "",
        caption: headline || "",
    });
}

function buildAuthorityLinks(detailUrl, consumerWebsite, companyWebsite, lotCheckUrl) {
    const links = [];

    if (detailUrl) {
        links.push(
            `FDA recall page <a href='${detailUrl}' target='_blank' rel='noopener noreferrer'>here</a>.`
        );
    }
    if (lotCheckUrl) {
        links.push(
            `Lot-check or replacement information <a href='${lotCheckUrl}' target='_blank' rel='noopener noreferrer'>here</a>.`
        );
    }
    if (consumerWebsite) {
        links.push(
            `Company consumer information <a href='${consumerWebsite}' target='_blank' rel='noopener noreferrer'>here</a>.`
        );
    }
    if (companyWebsite && companyWebsite !== consumerWebsite && companyWebsite !== lotCheckUrl) {
        links.push(
            `Company website <a href='${companyWebsite}' target='_blank' rel='noopener noreferrer'>here</a>.`
        );
    }

    return uniqueArray(links);
}

// ======================================================
// OPENAI HELPERS
// ======================================================

async function callOpenAI(prompt, label) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await openai.responses.create({
                model: MODEL,
                input: prompt,
            });

            const text = cleanText(response.output_text || "");
            if (!text) throw new Error("Empty OpenAI response");

            return text;
        } catch (err) {
            log(`OpenAI ${label} failed (attempt ${attempt}/${MAX_RETRIES}) → ${err.message}`);
            if (attempt < MAX_RETRIES) {
                await randomDelay(`before OpenAI retry (${label})`);
            }
        }
    }

    return "";
}

async function rewriteAnnouncementForSEO({
    title,
    companyName,
    brandName,
    productDescription,
    productType,
    reason,
    rawAnnouncement,
}) {
    if (!cleanText(rawAnnouncement) || cleanText(rawAnnouncement).length < 40) return "";

    const prompt = `
Rewrite the following FDA/company recall announcement for an informational article. Output must be readable and well-structured.

Format rules:
- Output must be valid HTML only (no Markdown). Use tags that are valid inside JSON.
- Use <p>...</p> for each paragraph.
- When the source lists products, lot numbers, expiration dates, or UPCs: return an HTML <table> with <thead><tr><th>...</th></tr></thead> and <tbody><tr><td>...</td></tr></tbody>. One row per product/variant.
- When the source lists steps or options (e.g. how to report to MedWatch): use <ul><li>...</li></ul>.
- Keep 2–4 short <p> paragraphs for the main summary; then add the <table> or <ul> for structured data below.
- No invented facts. Preserve all important details (lots, dates, UPCs, phone numbers). For links use <a href="URL">text</a>.

Tone and content:
- Neutral, factual tone. Keep it unique for SEO.
- Do NOT say the company announcement is ours. Make clear the information comes from the company announcement and/or FDA posting.
- Preserve facts. Do NOT include investor language, securities language, forward-looking statements, media boilerplate, or legal disclaimers.
- Focus only on recall facts, risks, and consumer action.

Context:
Title: ${title}
Company: ${companyName}
Brand: ${brandName}
Product: ${productDescription}
Product Type: ${productType}
Reason: ${reason}

Source announcement:
${rawAnnouncement}
`.trim();

    return await callOpenAI(prompt, "rewriteAnnouncement");
}

async function generateConsumerActionText({
    companyName,
    brandName,
    productDescription,
    reason,
    consumerPhone,
    consumerEmail,
    lotCheckUrl,
}) {
    const prompt = `
Write one short informational paragraph for consumers about what to do regarding this FDA recall.

Rules:
- Neutral and factual.
- Mention checking lot or product details if applicable.
- Mention contacting the company if support details exist.
- Do not invent instructions that are not supported by the provided context.
- No bullet points.
- No markdown.
- Maximum 90 words.
- Do not include legal disclaimers, forward-looking language, or investor information.

Context:
Company: ${companyName}
Brand: ${brandName}
Product: ${productDescription}
Reason: ${reason}
Consumer phone: ${consumerPhone}
Consumer email: ${consumerEmail}
Lot or replacement URL: ${lotCheckUrl}
`.trim();

    return await callOpenAI(prompt, "consumerAction");
}

// ======================================================
// PLAYWRIGHT HELPERS
// ======================================================

async function gotoWithRetry(page, url, waitSelector) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: NAV_TIMEOUT,
            });

            if (waitSelector) {
                await page.waitForSelector(waitSelector, { timeout: NAV_TIMEOUT });
            }

            return true;
        } catch (err) {
            log(`Navigation failed (attempt ${attempt}/${MAX_RETRIES}) ${url} → ${err.message}`);
            if (attempt < MAX_RETRIES) {
                await randomDelay("before navigation retry");
            }
        }
    }

    return false;
}

async function waitForDatatableReady(page) {
    await page.waitForSelector("#datatable", { timeout: NAV_TIMEOUT });
    await page.waitForSelector("#datatable tbody tr", { timeout: NAV_TIMEOUT });

    await page
        .waitForSelector("#datatable_processing", {
            state: "visible",
            timeout: 5000,
        })
        .catch(() => { });

    await page
        .waitForSelector("#datatable_processing", {
            state: "hidden",
            timeout: NAV_TIMEOUT,
        })
        .catch(() => { });
}

async function clickNextDatatablePage(page) {
    try {
        const next = await page.$("#datatable_next");
        if (!next) return false;

        const hasDisabled = await page.evaluate(() => {
            const el = document.querySelector("#datatable_next");
            return el ? el.classList.contains("disabled") : true;
        }).catch(() => true);

        if (hasDisabled) {
            log("No more pages (Next is disabled)");
            return false;
        }

        await page.evaluate(() => {
            document.querySelector("#datatable_next a")?.click();
        }).catch(() => {});

        await page.waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 }).catch(() => {});
        await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: 10000 }).catch(() => {});
        await page.waitForSelector("#datatable tbody tr").catch(() => {});

        return true;
    } catch (err) {
        log(`Next pagination failed safely: ${err.message || err}`);
        return false;
    }
}

// ======================================================
// DOM EXTRACTION - LIST PAGE
// ======================================================

async function extractListRows(page) {
    return await page.evaluate(() => {
        const clean = (v) => (v || "").replace(/\s+/g, " ").trim();
        const rows = [];

        document.querySelectorAll("#datatable tbody tr").forEach((tr) => {
            const cells = tr.querySelectorAll("td");
            const linkEl = tr.querySelector("td a");

            const dateText = clean(cells[0]?.innerText || "");
            const dateTime = clean(cells[0]?.querySelector("time")?.getAttribute("datetime") || "");
            const brandName = clean(cells[1]?.innerText || "");
            const productDescription = clean(cells[2]?.innerText || "");
            const productType = clean(cells[3]?.innerText || "");
            const reason = clean(cells[4]?.innerText || "");
            const companyName = clean(cells[5]?.innerText || "");
            const terminatedRecall = clean(cells[6]?.innerText || "");

            let href = clean(linkEl?.getAttribute("href") || "");
            if (href && !href.startsWith("http")) {
                href = "https://www.fda.gov" + href;
            }

            rows.push({
                listDateText: dateText,
                listDateTime: dateTime,
                listBrandName: brandName,
                listProductDescription: productDescription,
                listProductType: productType,
                listReason: reason,
                listCompanyName: companyName,
                listTerminatedRecall: terminatedRecall,
                detailUrl: href,
            });
        });

        return rows;
    });
}

// ======================================================
// DOM EXTRACTION - DETAIL PAGE (FIXED)
// ======================================================

async function extractDetailPage(detailPage, detailUrl) {
    const ok = await gotoWithRetry(detailPage, detailUrl, "#main-content");
    if (!ok) return null;

    try {
        return await detailPage.evaluate(() => {
            const clean = (v) =>
                String(v || "")
                    .replace(/\u00a0/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

            // FIX: define inside browser context
            const uniqueArray = (arr) => {
                const seen = new Set();
                const out = [];
                for (const v of arr || []) {
                    const val = clean(v);
                    if (val && !seen.has(val)) {
                        seen.add(val);
                        out.push(val);
                    }
                }
                return out;
            };

            const absolute = (url) => {
                let v = clean(url);
                if (!v) return "";
                if (/^mailto:/i.test(v)) return "";
                if (/^tel:/i.test(v)) return "";
                if (v.startsWith("//")) v = "https:" + v;
                if (v.startsWith("/")) v = "https://www.fda.gov" + v;
                if (!/^https?:\/\//i.test(v) && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) {
                    v = "https://" + v;
                }
                try {
                    const u = new URL(v);
                    u.hash = "";
                    return u.toString();
                } catch {
                    return "";
                }
            };

            const textOf = (selector) => clean(document.querySelector(selector)?.innerText || "");
            const attrOf = (selector, attr) =>
                clean(document.querySelector(selector)?.getAttribute(attr) || "");

            const getDtDdText = (label) => {
                const dts = [...document.querySelectorAll("dt")];
                const dt = dts.find((el) => clean(el.innerText).toLowerCase().includes(label.toLowerCase()));
                return clean(dt?.nextElementSibling?.innerText || "");
            };

            const getTimeForCell = (selector) => {
                const el = document.querySelector(selector);
                return {
                    text: clean(el?.innerText || ""),
                    dateTime: clean(el?.querySelector("time")?.getAttribute("datetime") || ""),
                };
            };

            const normalizeText = (text) =>
                clean(
                    String(text || "")
                        .replace(/\bExternal Link Disclaimer\b/gi, " ")
                        .replace(/\bRead Announcement\b/gi, " ")
                        .replace(/\bView Product Photos\b/gi, " ")
                );

            const extractUrlsFromText = (text) => {
                const matches =
                    String(text || "").match(
                        /(?:https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>()]+|(?:[a-z0-9-]+\.)+[a-z]{2,})/gi
                    ) || [];
                const urls = [];
                const seen = new Set();

                for (const m of matches) {
                    let v = clean(m).replace(/[),.;]+$/g, "");
                    if (!/^https?:\/\//i.test(v) && !v.startsWith("/")) {
                        v = "https://" + v;
                    }
                    v = absolute(v);
                    if (v && !seen.has(v)) {
                        seen.add(v);
                        urls.push(v);
                    }
                }

                return urls;
            };

            const extractEmails = (text) =>
                [...new Set(String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];

            const extractPhones = (text) =>
                [...new Set(
                    String(text || "").match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g) || []
                )];

            const isLiabilityOrIrrelevantParagraph = (text) => {
                const lower = clean(text).toLowerCase();
                if (!lower) return true;

                const blockedPatterns = [
                    "forward-looking",
                    "private litigation securities reform act",
                    "no obligation to update",
                    "risk factors",
                    "sec",
                    "securities and exchange commission",
                    "form 10-k",
                    "financial performance",
                    "guidance, estimates and projections",
                    "current expectations, assumptions, plans",
                    "materially different from its current expectations",
                    "company undertakes no obligation",
                ];

                return blockedPatterns.some((p) => lower.includes(p));
            };

            const pageTypeLabel = textOf(".content-type-label");
            const title = textOf("h1.content-title") || textOf("#main-content h1");
            const disclaimer = clean(
                document.querySelector("#disclaimer p")?.innerText ||
                document.querySelector("#disclaimer")?.innerText ||
                ""
            );

            const companyAnnouncementDate = getTimeForCell(".cell-2_1");
            const fdaPublishDate = getTimeForCell(".cell-2_2");
            const productType = textOf(".cell-2_3") || getDtDdText("Product Type");
            const reason = textOf(".cell-2_4 .field--item") || getDtDdText("Reason for Announcement");
            const companyName = textOf(".cell-2_5") || getDtDdText("Company Name");
            const brandNames = [...document.querySelectorAll(".cell-2_6 .field--item")]
                .map((el) => clean(el.innerText))
                .filter(Boolean);
            const productDescription = [...document.querySelectorAll(".cell-2_7 .field--item")]
                .map((el) => clean(el.innerText))
                .filter(Boolean)
                .join(" | ");

            const announcementHeading = document.querySelector("#recall-announcement");
            const announcementParagraphs = [];
            const announcementBullets = [];
            const keptAnnouncementLinks = [];
            const rejectedParagraphs = [];

            function collectParagraph(el) {
                const txt = normalizeText(el.innerText);
                if (!txt) return;
                if (isLiabilityOrIrrelevantParagraph(txt)) {
                    rejectedParagraphs.push(txt);
                } else {
                    announcementParagraphs.push(txt);
                }
                [...el.querySelectorAll("a[href]")].forEach((a) => {
                    const href = absolute(a.getAttribute("href"));
                    const text = clean(a.innerText);
                    if (href) keptAnnouncementLinks.push({ href, text });
                });
            }
            function collectList(ulEl) {
                const items = [...ulEl.querySelectorAll("li")]
                    .map((li) => normalizeText(li.innerText))
                    .filter(Boolean)
                    .filter((txt) => !isLiabilityOrIrrelevantParagraph(txt));
                announcementBullets.push(...items);
                [...ulEl.querySelectorAll("a[href]")].forEach((a) => {
                    const href = absolute(a.getAttribute("href"));
                    const text = clean(a.innerText);
                    if (href) keptAnnouncementLinks.push({ href, text });
                });
            }

            if (announcementHeading) {
                let node = announcementHeading.nextElementSibling;

                while (node) {
                    if (node.id === "recall-photos") break;

                    const tag = (node.tagName || "").toLowerCase();
                    const headingText = clean(node.querySelector?.("h2")?.innerText || node.innerText || "");

                    if (
                        tag === "div" &&
                        headingText.toLowerCase().includes("company contact information")
                    ) {
                        break;
                    }

                    if (
                        tag === "hr" &&
                        node.nextElementSibling &&
                        /company contact information/i.test(clean(node.nextElementSibling.innerText || ""))
                    ) {
                        break;
                    }

                    if (tag === "p") {
                        collectParagraph(node);
                    } else if (tag === "ul") {
                        collectList(node);
                    } else if (tag === "div") {
                        // All <p> and <ul> between announcement and #recall-photos (including nested, e.g. lot numbers, MedWatch)
                        const allPAndUl = node.querySelectorAll("p, ul");
                        allPAndUl.forEach((el) => {
                            if (el.closest("#recall-photos")) return;
                            const t = (el.tagName || "").toLowerCase();
                            if (t === "p") collectParagraph(el);
                            else if (t === "ul") collectList(el);
                        });
                    }

                    node = node.nextElementSibling;
                }
            }

            const dedupLinks = [];
            const seenLinks = new Set();
            for (const link of keptAnnouncementLinks) {
                if (!link.href || seenLinks.has(link.href)) continue;
                seenLinks.add(link.href);
                dedupLinks.push(link);
            }

            const contactHeading = [...document.querySelectorAll("h2")]
                .find((h) => clean(h.innerText).toLowerCase() === "company contact information");

            const contacts = {
                consumers: {
                    label: "",
                    organization: "",
                    phone: "",
                    email: "",
                    website: "",
                },
                media: {
                    label: "",
                    name: "",
                    role: "",
                    email: "",
                    phone: "",
                },
            };

            if (contactHeading) {
                const section = contactHeading.parentElement;
                const dts = [...section.querySelectorAll("dt")];

                for (const dt of dts) {
                    const label = clean(dt.innerText).replace(/:$/, "");
                    const labelLower = label.toLowerCase();

                    const relatedDds = [];
                    let node = dt.nextElementSibling;
                    while (node && node.tagName && node.tagName.toLowerCase() === "dd") {
                        relatedDds.push(node);
                        node = node.nextElementSibling;
                    }

                    const textBlob = clean(relatedDds.map((dd) => dd.innerText).join(" | "));
                    const emails = extractEmails(textBlob);
                    const phones = extractPhones(textBlob);

                    if (labelLower.includes("consumer")) {
                        contacts.consumers.label = label + ":";
                        contacts.consumers.phone = phones[0] || "";
                        contacts.consumers.email = emails[0] || "";

                        const nonContactLines = relatedDds
                            .map((dd) => clean(dd.innerText))
                            .filter(Boolean)
                            .filter((line) => !emails.includes(line))
                            .filter((line) => !phones.includes(line));

                        contacts.consumers.organization = nonContactLines[0] || "";
                    }

                    if (labelLower.includes("media")) {
                        contacts.media.label = label + ":";
                        contacts.media.phone = phones[0] || "";
                        contacts.media.email = emails[0] || "";

                        const mainLine = clean(
                            textBlob
                                .replace(contacts.media.email, "")
                                .replace(contacts.media.phone, "")
                                .replace(/\s+\|\s+/g, " | ")
                        );

                        if (mainLine) {
                            const parts = mainLine.split(",").map((v) => clean(v)).filter(Boolean);
                            contacts.media.name = parts[0] || "";
                            contacts.media.role = parts.slice(1).join(", ");
                        }
                    }
                }
            }

            const contentCurrentAsOfText = textOf(".node-current-date time");
            const contentCurrentAsOfDateTime = attrOf(".node-current-date time", "datetime");

            const regulatedProductsHeading = [...document.querySelectorAll(".lcds-description-list__item-heading")]
                .find((h) => clean(h.innerText).toLowerCase().includes("regulated product"));

            let regulatedProducts = [];
            if (regulatedProductsHeading) {
                const parent = regulatedProductsHeading.closest("li, div");
                regulatedProducts = [...parent.querySelectorAll(".lcds-metadata-list li")]
                    .map((li) => clean(li.innerText))
                    .filter(Boolean);
            }

            const images = [];
            const seenImages = new Set();

            document.querySelectorAll("#main-content picture").forEach((pic) => {
                const source =
                    pic.querySelector("source[srcset*='recall_image_large']") ||
                    pic.querySelector("source[srcset*='large']") ||
                    pic.querySelector("source[srcset]");
                const img = pic.querySelector("img");

                let src = "";
                if (source) {
                    src = clean(source.getAttribute("srcset") || "").split(" ")[0];
                } else if (img) {
                    src = clean(img.getAttribute("src") || "");
                }

                src = absolute(src).split("?")[0];

                if (src && !seenImages.has(src)) {
                    seenImages.add(src);
                    images.push(src);
                }
            });

            const allAnnouncementText = normalizeText(
                [...announcementParagraphs, ...announcementBullets].join(" ")
            );
            const allTextUrls = extractUrlsFromText(allAnnouncementText);

            const allLinks = uniqueArray([
                ...dedupLinks.map((l) => l.href),
                ...allTextUrls,
            ]);

            let lotCheckUrl = "";
            let consumerWebsite = "";
            let companyWebsite = "";

            for (const href of allLinks) {
                const lower = href.toLowerCase();

                if (!lotCheckUrl && /(check-pods|check|lot|replacement|recall|corrective-action)/i.test(lower)) {
                    lotCheckUrl = href;
                    continue;
                }

                if (!consumerWebsite && /(support|current-podders|customer|consumer|medwatch|report)/i.test(lower)) {
                    consumerWebsite = href;
                    continue;
                }

                if (
                    !companyWebsite &&
                    !/fda\.gov\/safety\/medwatch/i.test(lower) &&
                    !/fda\.gov\/about-fda\/website-policies/i.test(lower)
                ) {
                    companyWebsite = href;
                }
            }

            if (!companyWebsite) {
                const nakedDomains = extractUrlsFromText(allAnnouncementText)
                    .filter((u) => !u.includes("fda.gov"))
                    .filter((u) => !/medwatch|report/i.test(u));
                companyWebsite = nakedDomains[0] || "";
            }

            const aboutParagraph = announcementParagraphs.find((p) =>
                /^about\b/i.test(p) || /headquartered/i.test(p)
            );
            const aboutCompanyText = aboutParagraph ? clean(aboutParagraph).slice(0, 240) : "";

            const rawAnnouncement = normalizeText(
                [
                    announcementBullets.length ? announcementBullets.map((b) => `• ${b}`).join("\n") : "",
                    announcementParagraphs.join("\n\n"),
                ]
                    .filter(Boolean)
                    .join("\n\n")
            );

            return {
                title,
                pageTypeLabel,
                disclaimer,

                companyAnnouncementDate,
                fdaPublishDate,
                productType,
                reason,
                companyName,
                brandNames,
                productDescription,

                rawAnnouncement,
                announcementBullets,
                announcementParagraphs,
                aboutCompanyText,

                contacts,

                lotCheckUrl,
                consumerWebsite,
                companyWebsite,

                contentCurrentAsOfText,
                contentCurrentAsOfDateTime,
                regulatedProducts,

                images,
            };
        });
    } catch (err) {
        log(`EVAL ERROR on ${detailUrl} → ${err.message}`);
        return null;
    }
}

// ======================================================
// TRANSFORM DETAIL DATA
// ======================================================

function mergeListAndDetailData(listRow, detailData) {
    const companyName = cleanText(detailData.companyName || listRow.listCompanyName || "");
    const brandName =
        cleanText(detailData.brandNames?.[0] || listRow.listBrandName || "");
    const productDescription =
        cleanText(detailData.productDescription || listRow.listProductDescription || "");
    const productType =
        cleanText(detailData.productType || listRow.listProductType || "");
    const reason = cleanText(detailData.reason || listRow.listReason || "");

    return omitEmptyDeep({
        title: cleanText(detailData.title),
        pageTypeLabel: cleanText(detailData.pageTypeLabel),
        disclaimer: cleanText(detailData.disclaimer),

        companyAnnouncementDateText:
            cleanText(detailData.companyAnnouncementDate?.text || ""),
        companyAnnouncementDateTime:
            cleanText(detailData.companyAnnouncementDate?.dateTime || ""),
        fdaPublishDateText:
            cleanText(detailData.fdaPublishDate?.text || listRow.listDateText || ""),
        fdaPublishDateTime:
            cleanText(detailData.fdaPublishDate?.dateTime || listRow.listDateTime || ""),

        companyName,
        brandName,
        brandNames: uniqueArray([brandName, ...(detailData.brandNames || [])]),
        productDescription,
        productType,
        regulatedProducts: uniqueArray([
            productType,
            ...(detailData.regulatedProducts || []),
        ]),
        reason,

        rawAnnouncement: cleanText(detailData.rawAnnouncement),
        announcementBullets: uniqueArray(detailData.announcementBullets || []),
        announcementParagraphs: uniqueArray(detailData.announcementParagraphs || []),
        aboutCompanyText: cleanText(detailData.aboutCompanyText),

        contacts: detailData.contacts || {},

        lotCheckUrl: normalizeUrl(detailData.lotCheckUrl),
        consumerWebsite: normalizeUrl(detailData.consumerWebsite),
        companyWebsite: normalizeUrl(detailData.companyWebsite),

        contentCurrentAsOfText: cleanText(detailData.contentCurrentAsOfText),
        contentCurrentAsOfDateTime: cleanText(detailData.contentCurrentAsOfDateTime),

        terminatedRecall: cleanText(listRow.listTerminatedRecall || ""),
        images: uniqueArray(detailData.images || []),
    });
}

// ======================================================
// CONTENT SECTION BUILDER
// ======================================================

function buildFallbackRecallSummary(data) {
    const entity = data.brandName || data.companyName || "The company";
    const product = data.productDescription || "the product";
    const reason = data.reason
        ? ` The recall notice said the issue was ${data.reason}.`
        : "";
    const fdaDate = normalizeDate(data.fdaPublishDateTime || data.fdaPublishDateText);
    const dateText = fdaDate ? ` FDA published the notice on ${fdaDate}.` : "";

    return cleanText(
        `${entity} posted a recall announcement involving ${product}.${reason}${dateText}`
    );
}

function buildContactSectionText(contacts) {
    const parts = [];

    if (contacts?.consumers?.organization || contacts?.consumers?.phone || contacts?.consumers?.email) {
        parts.push(
            cleanText(
                `Consumer support: ${[
                    contacts.consumers.organization,
                    contacts.consumers.phone,
                    contacts.consumers.email,
                ]
                    .filter(Boolean)
                    .join(" | ")}`
            )
        );
    }

    if (contacts?.media?.name || contacts?.media?.role || contacts?.media?.email || contacts?.media?.phone) {
        parts.push(
            cleanText(
                `Media contact: ${[
                    contacts.media.name,
                    contacts.media.role,
                    contacts.media.email,
                    contacts.media.phone,
                ]
                    .filter(Boolean)
                    .join(" | ")}`
            )
        );
    }

    return parts.filter(Boolean).join("\n");
}

function buildContentSections({
    data,
    rewrittenSummary,
    consumerActionText,
    authorityLinks,
}) {
    const sections = [];

    sections.push(
        omitEmptyDeep({
            subtitle: "Recall Summary",
            text: rewrittenSummary || buildFallbackRecallSummary(data),
            authorityLinks,
        })
    );

    sections.push(
        omitEmptyDeep({
            subtitle: "What Was Recalled",
            facts: omitEmptyDeep({
                company: cleanText(data.companyName || ""),
                brand: cleanText(data.brandName || ""),
                product: cleanText(data.productDescription || ""),
                productType: cleanText(data.productType || ""),
            }),
        })
    );

    sections.push(
        omitEmptyDeep({
            subtitle: "Reason for Recall",
            text:
                data.reason ||
                "The FDA listing included a recall reason for this product.",
        })
    );

    if (consumerActionText) {
        sections.push(
            omitEmptyDeep({
                subtitle: "What Consumers Should Do",
                text: consumerActionText,
                authorityLinks,
            })
        );
    } else {
        const fallbackText = cleanText(
            [
                data.lotCheckUrl
                    ? "Consumers should review the company or lot-check link for affected items."
                    : "",
                data.contacts?.consumers?.phone
                    ? `Customers can contact support at ${data.contacts.consumers.phone}.`
                    : "",
                data.contacts?.consumers?.email
                    ? `Support email: ${data.contacts.consumers.email}.`
                    : "",
            ]
                .filter(Boolean)
                .join(" ")
        );

        if (fallbackText) {
            sections.push(
                omitEmptyDeep({
                    subtitle: "What Consumers Should Do",
                    text: fallbackText,
                    authorityLinks,
                })
            );
        }
    }

    const contactText = buildContactSectionText(data.contacts);
    if (contactText) {
        sections.push(
            omitEmptyDeep({
                subtitle: "Company Contact Information",
                text: contactText,
            })
        );
    }

    if (data.aboutCompanyText) {
        sections.push(
            omitEmptyDeep({
                subtitle: "About the Company",
                text: data.aboutCompanyText,
            })
        );
    }

    sections.push(
        omitEmptyDeep({
            subtitle: "Official Source",
            text: cleanText(
                `According to the U.S. Food and Drug Administration (FDA), this recall notice was published on ${normalizeDate(data.fdaPublishDateTime || data.fdaPublishDateText) || "the FDA recall page"
                }.`
            ),
            authorityLinks,
        })
    );

    return sections
        .map((section) => omitEmptyDeep(section))
        .filter((section) => cleanText(section.text));
}

// ======================================================
// MAIN
// ======================================================

function normalizeSourceUrl(url) {
    if (!url || typeof url !== "string") return "";
    const u = url.trim().replace(/\/+$/, "");
    return u || "";
}

(async () => {
    const results = safeReadJson(JSON_PATH, []);
    const imageMap = safeReadJson(IMAGE_MAP_PATH, {});

    const processedUrls = new Set();
    for (const item of results) {
        const u = normalizeSourceUrl(item.sourceUrl);
        if (u) processedUrls.add(u);
    }
    const existingSlugs = new Set(
        results.map((item) => item.id).filter(Boolean)
    );

    let currentSortOrder = START_SORT_ORDER;
    const sortOrders = new Set(
        results
            .map((item) => (typeof item.sortOrder === "number" ? item.sortOrder : null))
            .filter((n) => n != null)
    );
    if (sortOrders.size > 0) {
        const maxSort = Math.max(...sortOrders);
        currentSortOrder = maxSort + 1;
        const minSort = Math.min(...sortOrders);
        const gaps = [];
        for (let i = minSort; i <= maxSort; i++) {
            if (!sortOrders.has(i)) gaps.push(i);
        }
        if (gaps.length > 0) {
            log(`SortOrder gaps (missing): ${gaps.join(", ")}`);
        }
    }

    log(`Loaded existing recalls: ${results.length}, unique sourceUrls: ${processedUrls.size}`);
    log(`Next ascending sortOrder: ${currentSortOrder}`);
    progress.update({ phase: "Start", current: 0, total: MAX_RECORDS, status: "Launching browser..." });

    const browser = await chromium.launch({
        headless: HEADLESS,
        slowMo: 150,
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        locale: "en-US",
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);
    page.setDefaultTimeout(NAV_TIMEOUT);

    progress.update({ phase: "FDA List", status: "Opening listing..." });
    log("Opening FDA recalls listing...");
    const listOk = await gotoWithRetry(page, FDA_LIST_URL, "#datatable");
    if (!listOk) {
        log("Could not load FDA listing page.");
        progress.finish("Failed to load FDA listing.");
        await browser.close();
        process.exit(1);
    }

    await waitForDatatableReady(page);
    await randomDelay("after initial listing load");

    progress.update({ phase: "Setup", status: "DataTable 100/page..." });
    await page.selectOption("select.form-control.input-sm", "100");
    await page.selectOption("#edit-field-terminated-recall", "0");
    await page.waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 }).catch(() => {});
    await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForSelector("#datatable tbody tr");
    log("Set DataTable page size to 100 and Terminated Recall filter to No");

    let pageIndex = 1;
    let addedThisRun = 0;
    let hasNext = true;

    while (
        hasNext &&
        addedThisRun < MAX_RECORDS
    ) {
        progress.update({ phase: "Scrape", current: addedThisRun, total: MAX_RECORDS, status: `Page ${pageIndex}...` });
        log(`Reading DataTable page ${pageIndex}...`);

        await waitForDatatableReady(page);

        const rows = await extractListRows(page);
        log(`Rows found on page ${pageIndex}: ${rows.length}`);

        for (const listRow of rows) {
            if (addedThisRun >= MAX_RECORDS) break;

            const detailUrl = listRow.detailUrl;
            if (!detailUrl) continue;

            const normalizedDetailUrl = normalizeSourceUrl(detailUrl);
            if (normalizedDetailUrl && processedUrls.has(normalizedDetailUrl)) {
                log(`Skip already processed: ${detailUrl}`);
                continue;
            }

            const shortUrl = detailUrl.replace(/^https?:\/\//, "").slice(0, 35);
            progress.update({ phase: "Scrape", current: addedThisRun, total: MAX_RECORDS, status: shortUrl + "…" });
            log(`Processing detail page: ${detailUrl}`);

            const detailPage = await context.newPage();
            detailPage.setDefaultNavigationTimeout(NAV_TIMEOUT);
            detailPage.setDefaultTimeout(NAV_TIMEOUT);

            try {
                const detailData = await extractDetailPage(detailPage, detailUrl);
                if (!detailData) {
                    log(`Failed to extract detail page: ${detailUrl}`);
                    await detailPage.close();
                    await randomDelay("after failed detail page");
                    continue;
                }

                const merged = mergeListAndDetailData(listRow, detailData);

                const publishedDate =
                    normalizeDate(merged.fdaPublishDateTime) ||
                    normalizeDate(merged.fdaPublishDateText) ||
                    normalizeDate(merged.companyAnnouncementDateTime) ||
                    normalizeDate(merged.companyAnnouncementDateText) ||
                    todayISODate();

                const year = extractYear(publishedDate, "2026");
                const slugBase = buildSlugBase({
                    brandName: merged.brandName,
                    companyName: merged.companyName,
                    productDescription: merged.productDescription,
                    year,
                });
                const slug = ensureUniqueSlug(slugBase, existingSlugs);
                const folderName = `${currentSortOrder}-${slug}`;

                log(`Slug: ${slug}`);
                log(`Folder: ${folderName}`);

                const rewrittenSummary = await rewriteAnnouncementForSEO({
                    title: merged.title,
                    companyName: merged.companyName,
                    brandName: merged.brandName,
                    productDescription: merged.productDescription,
                    productType: merged.productType,
                    reason: merged.reason,
                    rawAnnouncement: merged.rawAnnouncement,
                });

                await randomDelay("after rewrite");

                const consumerActionText = await generateConsumerActionText({
                    companyName: merged.companyName,
                    brandName: merged.brandName,
                    productDescription: merged.productDescription,
                    reason: merged.reason,
                    consumerPhone: merged.contacts?.consumers?.phone || "",
                    consumerEmail: merged.contacts?.consumers?.email || "",
                    lotCheckUrl: merged.lotCheckUrl || "",
                });

                await randomDelay("after consumer action generation");

                const savedImages = [];
                if (merged.images && merged.images.length > 0) {
                    for (const imageUrl of merged.images) {
                        const localPath = await processImage(imageUrl, folderName, imageMap);
                        if (localPath) savedImages.push(localPath);
                        await randomDelay("between images");
                    }
                }

                const canonicalUrl = makeCanonicalUrl(slug);
                const authorityLinks = buildAuthorityLinks(
                    detailUrl,
                    merged.consumerWebsite,
                    merged.companyWebsite,
                    merged.lotCheckUrl
                );

                const contentSections = buildContentSections({
                    data: merged,
                    rewrittenSummary,
                    consumerActionText,
                    authorityLinks,
                });

                const description = makeDescription({
                    companyName: merged.companyName,
                    brandName: merged.brandName,
                    productDescription: merged.productDescription,
                    reason: merged.reason,
                    year,
                });

                const keywords = makeKeywords({
                    companyName: merged.companyName,
                    brandName: merged.brandName,
                    productDescription: merged.productDescription,
                    productType: merged.productType,
                    reason: merged.reason,
                    regulatedProducts: merged.regulatedProducts || [],
                    year,
                });

                const article = omitEmptyDeep({
                    "@context": "https://schema.org",
                    "@type": "Article",

                    id: slug,
                    sortOrder: currentSortOrder,
                    canonicalUrl,
                    mainEntityOfPage: canonicalUrl,
                    headline: merged.title || `${merged.brandName || merged.companyName || "FDA"} recall`,
                    author: {
                        "@type": "Organization",
                        name: "RecallsAtlas",
                        url: SITE_BASE_URL,
                    },
                    publisher: {
                        "@type": "Organization",
                        name: "RecallsAtlas",
                        logo: {
                            "@type": "ImageObject",
                            url: `${SITE_BASE_URL}/logo.png`,
                        },
                    },
                    datePublished: publishedDate,
                    dateModified: todayISODate(),
                    image: buildPrimaryImageObject(savedImages, merged.title),
                    description,
                    keywords,
                    content: contentSections,

                    sourceUrl: detailUrl,
                    scrapedAt: nowISO(),

                    pageTypeLabel: merged.pageTypeLabel,
                    disclaimer: merged.disclaimer,

                    title: merged.title,

                    companyAnnouncementDate: merged.companyAnnouncementDateText,
                    companyAnnouncementDateTime: normalizeDateTime(merged.companyAnnouncementDateTime),
                    fdaPublishDate: merged.fdaPublishDateText,
                    fdaPublishDateTime: normalizeDateTime(merged.fdaPublishDateTime),

                    companyName: merged.companyName,
                    brandName: merged.brandName,
                    brandNames: merged.brandNames,

                    productDescription: merged.productDescription,
                    productType: merged.productType,
                    regulatedProducts: merged.regulatedProducts,

                    reason: merged.reason,

                    terminatedRecall: merged.terminatedRecall,

                    aboutCompanyText: merged.aboutCompanyText,

                    lotCheckUrl: merged.lotCheckUrl,
                    consumerWebsite: merged.consumerWebsite,
                    companyWebsite: merged.companyWebsite,

                    contacts: merged.contacts,

                    contentCurrentAsOf: merged.contentCurrentAsOfText,
                    contentCurrentAsOfDateTime: normalizeDateTime(merged.contentCurrentAsOfDateTime),

                    images: savedImages,
                    rawImageSources: merged.images,
                });

                if (!savedImages.length) {
                    delete article.images;
                    delete article.rawImageSources;
                }

                results.push(article);
                if (normalizedDetailUrl) processedUrls.add(normalizedDetailUrl);
                addedThisRun += 1;
                currentSortOrder += 1;
                saveAll(results, imageMap);
                progress.update({ phase: "Scrape", current: addedThisRun, total: MAX_RECORDS, status: `Saved ${slug}` });
                if (addedThisRun % 5 === 0) {
                    log(`Checkpoint: saved after ${addedThisRun} recalls.`);
                }
                log(`Saved article ${addedThisRun}/${MAX_RECORDS} this run.`);

                await detailPage.close();
                await randomDelay("after detail complete");
            } catch (err) {
                log(`Detail processing error for ${detailUrl} → ${err.message}`);
                try {
                    await detailPage.close();
                } catch { }
                await randomDelay("after detail error");
            }
        }

        if (addedThisRun >= MAX_RECORDS) {
            hasNext = false;
            break;
        }

        if (addedThisRun > 0 && addedThisRun % 100 === 0) {
            saveAll(results, imageMap);
            progress.update({ phase: "Pause", status: "Click Next in browser, then Enter here" });
            log("Reached 100 recalls. Please click Next in the FDA table in the browser, then press Enter here to continue.");
            await new Promise((resolve) => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question("Press Enter after you clicked Next... ", () => {
                    rl.close();
                    resolve();
                });
            });
            pageIndex += 1;
            continue;
        }

        const moved = await clickNextDatatablePage(page);
        if (!moved) {
            hasNext = false;
            log("No more DataTable pages.");
            break;
        }

        pageIndex += 1;
    }

    saveAll(results, imageMap);
    await browser.close();
    progress.finish(`DONE · ${addedThisRun} recalls this run, ${results.length} total`);
    log("DONE");
})();