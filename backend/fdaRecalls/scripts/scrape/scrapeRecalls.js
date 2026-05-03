const path = require("path");
const fs = require("fs");
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

const { chromium } = require("playwright");
const readline = require("readline");
const axios = require("axios");
const sharp = require("sharp");
const crypto = require("crypto");
const OpenAI = require("openai");

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

function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ======================================================
// CONFIG
// ======================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = readOption("OPENAI_MODEL") || "gpt-4.1-mini";

const FDA_BASE_URL = "https://www.fda.gov";
const FDA_LIST_URL =
    "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";

const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://recallsatlas.com";
const SITE_RECALLS_PATH = "/recalls";

// Scripts root holds recalls.json, image-map.json, recalls-log.txt.
// Images must live under the Next.js site "public" folder so URLs like /images/recalls/... work.
//   Server (backend next to public/):  <site>/public/images/recalls
//   Dev monorepo:                       <repo>/frontend/public/images/recalls
function resolveImageBaseDir() {
    const raw = process.env.IMAGE_BASE_DIR;
    if (raw && String(raw).trim()) {
        const t = String(raw).trim();
        const looksWinAbs = /^[a-zA-Z]:[\\/]/.test(t) || t.startsWith("\\\\");
        if (process.platform !== "win32" && looksWinAbs) {
            console.warn(
                "IMAGE_BASE_DIR looks like a Windows path; ignoring on this OS. Remove it or set a Linux path (e.g. /var/www/html/recallsatlas/public/images/recalls)."
            );
        } else {
            return path.resolve(t);
        }
    }
    const siteRoot = BACKEND_ROOT;
    const repoRoot = path.resolve(BACKEND_ROOT, "..");
    const prodPublic = path.join(siteRoot, "public", "images", "recalls");
    const devMonorepo = path.join(repoRoot, "frontend", "public", "images", "recalls");
    try {
        if (fs.existsSync(path.join(repoRoot, "frontend", "public"))) {
            return devMonorepo;
        }
    } catch (_) {}
    try {
        if (fs.existsSync(path.join(siteRoot, "public"))) {
            return prodPublic;
        }
    } catch (_) {}
    return devMonorepo;
}

const IMAGE_BASE_DIR = resolveImageBaseDir();
const JSON_PATH = path.join(DATA_ROOT, "fda-recalls-en-eeat.json");
const IMAGE_MAP_PATH = path.join(DATA_ROOT, "image-map.json");
const HASH_PATH = path.join(LOGS_ROOT, "fda-recalls-en-eeat.hashes.json");
const LOG_PATH = path.join(LOGS_ROOT, "recalls-log.txt");

// Initial archive anchor: a fresh 300-recall build numbers newest=300 and oldest=1.
// Future newer recalls continue upward: 301, 302, ...
const START_SORT_ORDER = readPositiveInt("SORT_ORDER_BASE", 300);
const MAX_RECORDS = readPositiveInt("MAX_RECORDS", 100);  // max NEW recalls per run
const MAX_TOTAL = readPositiveInt("MAX_TOTAL", 300);  // hard stop: never exceed this many total recalls
/** First N FDA table rows (with URLs): if all are already in recalls.json, stop Pass 1 immediately. */
const EARLY_EXIT_TOP_N = 5;
const MAX_RETRIES = 3;

const MIN_DELAY_MS = readPositiveInt("MIN_DELAY_MS", 5000);
const MAX_DELAY_MS = Math.max(MIN_DELAY_MS, readPositiveInt("MAX_DELAY_MS", 8000));
const VERBOSE_LOGS = /^(1|true|yes)$/i.test(String(readOption("VERBOSE_LOGS") || ""));

const NAV_TIMEOUT = 120000;
const IMAGE_TIMEOUT = 60000;

const IMAGE_MAX_WIDTH = 700;
const IMAGE_WEBP_QUALITY = 80;
const IMAGE_WEBP_EFFORT = 6;

/** Headless Playwright by default; set HEADLESS=false in scripts/.env (or backend/.env) to show the browser. */
const HEADLESS = process.env.HEADLESS !== "false";

/**
 * Re-number sortOrder 1→N by date, rename `{sortOrder}-{slug}/` image folders, sync paths to Mongo.
 *   node scripts/scrape/scrapeRecalls.js --fix-sort-order           # preview
 *   node scripts/scrape/scrapeRecalls.js --fix-sort-order --apply   # write JSON + disk + Mongo (no scrape, no OpenAI)
 */
const FIX_SORT_ORDER = process.argv.includes("--fix-sort-order");

// ======================================================
// INIT
// ======================================================

if (!FIX_SORT_ORDER && !OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
}

ensureDirSync(DATA_ROOT);
ensureDirSync(LOGS_ROOT);
ensureDirSync(IMAGE_BASE_DIR);

let openai = null;
if (!FIX_SORT_ORDER) {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

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
    _lastPlainKey: "",
    clear() {
        if (!isTTY) return;
        process.stdout.write("\r" + " ".repeat(process.stdout.columns || 80) + "\r");
    },
    render() {
        if (!isTTY) return;
        const pct = this.total > 0 ? Math.min(1, this.current / this.total) : 0;
        const filled = Math.round(PROGRESS_BAR_WIDTH * pct);
        const bar = "#".repeat(filled) + "-".repeat(PROGRESS_BAR_WIDTH - filled);
        const status = this.status ? `  ${this.status.slice(0, 44)}` : "";
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
        if (!isTTY) {
            const plainKey = `${this.phase}|${this.current}|${this.total}|${this.status}`;
            if (plainKey !== this._lastPlainKey) {
                this._lastPlainKey = plainKey;
                console.log(
                    `  STATUS  [${this.phase}] ${this.current}/${this.total}${this.status ? `  ${this.status}` : ""}`
                );
            }
            return;
        }
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

function verboseLog(message) {
    if (VERBOSE_LOGS) log(message);
}

function terminalRule(char = "=") {
    return char.repeat(Math.min(process.stdout.columns || 88, 88));
}

function cleanTerminalText(value, max = 96) {
    const text = cleanText(value || "");
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function printBlock(lines, char = "=") {
    progress.clear();
    console.log("");
    console.log(terminalRule(char));
    for (const line of lines) {
        console.log(line);
    }
    console.log(terminalRule(char));
    fs.appendFileSync(LOG_PATH, lines.join("\n") + "\n");
    progress.render();
}

function printRunSummary({ existingCount, maxRecords, maxTotal, runLimit, imageBaseDir }) {
    printBlock(
        [
            "FDA RECALL SCRAPE",
            `Existing records : ${existingCount}`,
            `This run target  : ${runLimit}`,
            `Max records flag : ${maxRecords}`,
            `Archive base     : ${START_SORT_ORDER}`,
            `Archive target   : ${maxTotal}`,
            `Verbose logs     : ${VERBOSE_LOGS ? "on" : "off"}`,
            `Image folder     : ${imageBaseDir}`,
        ],
        "="
    );
}

function printRecallHeader({ step, total, sortOrder, detailUrl }) {
    printBlock(
        [
            `RECALL ${step}/${total}`,
            `sortOrder : ${sortOrder}`,
            `source    : ${detailUrl}`,
        ],
        "-"
    );
}

function printRecallIdentity({ title, slug, folderName, companyName, productDescription, reason }) {
    printBlock(
        [
            `Title  : ${cleanTerminalText(title, 100)}`,
            `Company: ${cleanTerminalText(companyName, 100)}`,
            `Product: ${cleanTerminalText(productDescription, 100)}`,
            `Reason : ${cleanTerminalText(reason, 100)}`,
            `Slug   : ${slug}`,
            `Folder : ${folderName}`,
        ],
        "-"
    );
}

function printRecallDone({ step, total, sortOrder, slug, imageCount, totalSaved }) {
    printBlock(
        [
            `SAVED ${step}/${total}`,
            `sortOrder : ${sortOrder}`,
            `slug      : ${slug}`,
            `images    : ${imageCount}`,
            `file total: ${totalSaved}`,
        ],
        "-"
    );
}

function updateRecallStage(step, total, stage, detail = "") {
    const suffix = detail ? ` · ${detail}` : "";
    progress.update({
        phase: "Scrape",
        current: step,
        total: total || 1,
        status: `${stage}${suffix}`.slice(0, 60),
    });
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
    } catch (err) {
        log(`Failed reading JSON at ${filePath}: ${err.message}`);
        return fallback;
    }
}

function writeJson(filePath, data) {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function saveAll(results, imageMap, processedHashes = null) {
    // Always write newest first (highest sortOrder at index 0)
    const sorted = [...results].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
    writeJson(JSON_PATH, sorted);
    writeJson(IMAGE_MAP_PATH, imageMap);
    if (processedHashes) {
        writeJson(HASH_PATH, [...processedHashes].sort());
    }
    verboseLog(
        `Progress saved. recalls=${results.length} imageMap=${Object.keys(imageMap).length}` +
            (processedHashes ? ` hashes=${processedHashes.size}` : "")
    );
}

// ─── sortOrder repair (chronological 1→N, folders, Mongo) — run: --fix-sort-order [--apply] ───

function repairGetDate(r) {
    return (
        r.fdaPublishDateTime ||
        r.fdaPublishDate ||
        r.companyAnnouncementDateTime ||
        r.datePublished ||
        ""
    );
}

function repairGetFolderName(recall) {
    const firstPath =
        recall.images?.[0] ||
        (typeof recall.image === "object" ? recall.image?.url : recall.image) ||
        "";
    if (!firstPath) return null;
    const m = firstPath.match(/\/images\/recalls\/([^/]+)\//);
    return m ? m[1] : null;
}

function repairUpdateImagePaths(recall, oldFolder, newFolder) {
    const replace = (p) =>
        typeof p === "string"
            ? p.replace(`/images/recalls/${oldFolder}/`, `/images/recalls/${newFolder}/`)
            : p;
    if (Array.isArray(recall.images)) recall.images = recall.images.map(replace);
    if (typeof recall.image === "string") recall.image = replace(recall.image);
    if (recall.image && typeof recall.image === "object" && recall.image.url) {
        recall.image = { ...recall.image, url: replace(recall.image.url) };
    }
}

/**
 * Sort oldest→newest, assign sortOrder 1…N, update path strings. Returns { sorted, changes }.
 */
function planSortOrderRepair(results) {
    const sorted = [...results].sort((a, b) => {
        const da = repairGetDate(a);
        const db = repairGetDate(b);
        if (da < db) return -1;
        if (da > db) return 1;
        const sa = a.id || a.slug || "";
        const sb = b.id || b.slug || "";
        return sa < sb ? -1 : sa > sb ? 1 : 0;
    });

    const changes = [];
    sorted.forEach((recall, i) => {
        const newOrder = i + 1;
        const oldOrder = recall.sortOrder;
        const slug = recall.id || recall.slug || "";
        const oldFolder = repairGetFolderName(recall);
        const newFolder = oldFolder ? oldFolder.replace(/^\d+(-|$)/, `${newOrder}$1`) : null;

        if (oldOrder !== newOrder || (oldFolder && oldFolder !== newFolder)) {
            changes.push({ slug, oldOrder, newOrder, oldFolder, newFolder });
        }

        recall.sortOrder = newOrder;

        if (oldFolder && newFolder && oldFolder !== newFolder) {
            repairUpdateImagePaths(recall, oldFolder, newFolder);
        }
    });

    return { sorted, changes };
}

async function runFixSortOrderMode(apply) {
    if (!fs.existsSync(JSON_PATH)) {
        console.error(`${path.basename(JSON_PATH)} not found at:`, JSON_PATH);
        process.exit(1);
    }

    const raw = fs.readFileSync(JSON_PATH, "utf8");
    const results = JSON.parse(raw);
    if (!Array.isArray(results)) {
        console.error(`${path.basename(JSON_PATH)} must be a JSON array.`);
        process.exit(1);
    }

    log(`\n[fix-sort-order] Loaded ${results.length} recalls · image dir: ${IMAGE_BASE_DIR}`);
    const { sorted, changes } = planSortOrderRepair(results);

    log(`[fix-sort-order] Changes needed: ${changes.length}`);
    for (const c of changes) {
        const orderStr = `${String(c.oldOrder).padStart(4)} → ${String(c.newOrder).padStart(4)}`;
        const folderStr =
            c.oldFolder && c.oldFolder !== c.newFolder
                ? `  [folder: ${c.oldFolder} → ${c.newFolder}]`
                : "";
        log(`  ${orderStr}  ${c.slug}${folderStr}`);
    }

    if (!apply) {
        log("\n[fix-sort-order] Dry run — add --apply to write recalls.json, rename folders, update MongoDB.\n");
        return;
    }

    let renamedFolders = 0;
    let missingFolders = 0;

    for (const c of changes) {
        if (!c.oldFolder || !c.newFolder || c.oldFolder === c.newFolder) continue;

        const oldPath = path.join(IMAGE_BASE_DIR, c.oldFolder);
        const newPath = path.join(IMAGE_BASE_DIR, c.newFolder);

        if (!fs.existsSync(oldPath)) {
            missingFolders++;
            continue;
        }
        if (fs.existsSync(newPath)) {
            log(`  Skip rename (target exists): ${c.newFolder}`);
            continue;
        }

        try {
            fs.renameSync(oldPath, newPath);
            renamedFolders++;
            log(`  Renamed: ${c.oldFolder} → ${c.newFolder}`);
        } catch (err) {
            if (err.code === "EBUSY") {
                log(`  EBUSY (folder locked): ${c.oldFolder} — stop Next.js dev server and retry.`);
                process.exit(1);
            }
            throw err;
        }
    }

    log(`\n[fix-sort-order] Folders renamed: ${renamedFolders}  (${missingFolders} had no on-disk folder)`);

    const newestFirst = [...sorted].reverse();
    writeJson(JSON_PATH, newestFirst);
    log(`[fix-sort-order] ${path.basename(JSON_PATH)} updated (newest-first).`);

        const { getDb, close } = require("../../database/mongodb");
    const db = await getDb();
    const coll = db.collection("recalls");
    let mongoUpdated = 0;
    for (const recall of sorted) {
        const slug = recall.id || recall.slug;
        if (!slug) continue;
        await coll.updateOne(
            { slug },
            {
                $set: {
                    sortOrder: recall.sortOrder,
                    image: recall.image,
                    images: recall.images,
                },
            }
        );
        mongoUpdated++;
    }
    await close();
    log(`[fix-sort-order] MongoDB updated: ${mongoUpdated} document(s).\n`);
    log("[fix-sort-order] Done. Re-run without --apply to confirm 0 changes if needed.\n");
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

function buildRecallHash(value) {
    return crypto
        .createHash("sha256")
        .update(String(value || "").trim().toLowerCase())
        .digest("hex");
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

let imageFilenameIndexCache = null;

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

function findExistingImageByFilename(filename) {
    if (!filename || !fs.existsSync(IMAGE_BASE_DIR)) return null;

    if (!imageFilenameIndexCache) {
        imageFilenameIndexCache = new Map();
        const stack = [IMAGE_BASE_DIR];
        while (stack.length) {
            const dir = stack.pop();
            let entries = [];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                continue;
            }
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    stack.push(full);
                } else if (entry.isFile() && !imageFilenameIndexCache.has(entry.name)) {
                    imageFilenameIndexCache.set(entry.name, full);
                }
            }
        }
    }

    return imageFilenameIndexCache.get(filename) || null;
}

function rememberImageFilename(filename, filePath) {
    if (imageFilenameIndexCache && filename && filePath) {
        imageFilenameIndexCache.set(filename, filePath);
    }
}

async function copyExistingImageIfAvailable(filename, outputPath) {
    const existingPath = findExistingImageByFilename(filename);
    if (!existingPath || path.resolve(existingPath) === path.resolve(outputPath)) return false;
    await fs.promises.copyFile(existingPath, outputPath);
    rememberImageFilename(filename, outputPath);
    return true;
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
                    rememberImageFilename(mappedFilename, mappedPath);
                    verboseLog(`Image cache hit (url map): ${url}`);
                    return `/images/recalls/${folderName}/${mappedFilename}`;
                }
                if (await copyExistingImageIfAvailable(mappedFilename, mappedPath)) {
                    verboseLog(`Image cache copy (url map): ${mappedFilename}`);
                    return `/images/recalls/${folderName}/${mappedFilename}`;
                }
            }

            const buffer = await downloadBuffer(url);
            const digest = hashBuffer(buffer);
            const filename = `${digest}.webp`;

            const outputPath = path.join(recallDir, filename);
            if (!fs.existsSync(outputPath)) {
                if (await copyExistingImageIfAvailable(filename, outputPath)) {
                    verboseLog(`Reused hash-saved image: ${folderName}/${filename}`);
                } else {
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

                    verboseLog(`Saved image: ${folderName}/${filename}`);
                }
            } else {
                verboseLog(`Image already exists: ${folderName}/${filename}`);
            }

            rememberImageFilename(filename, outputPath);
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

function makeSeoHeadline({
    title,
    companyName,
    brandName,
    productDescription,
    reason,
}) {
    const current = cleanText(title || "");
    if (current && !/^product recall$/i.test(current)) return current;

    const entity = cleanText(brandName || companyName || "");
    const product = cleanText(productDescription || "Product");
    const hazard = cleanText(reason || "a safety issue");

    if (entity) {
        return cleanText(`${entity} Recalls ${product} Over ${hazard}`);
    }
    return cleanText(`Recall: ${product} Due to ${hazard}`);
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

function buildAuthorityLinks(detailUrl, consumerWebsite, companyWebsite, lotCheckUrl, reportingUrls = []) {
    const links = [];

    if (detailUrl) {
        links.push(
            `Read the official FDA recall notice <a href='${detailUrl}' target='_blank' rel='noopener noreferrer'>on the FDA website</a>.`
        );
    }
    if (lotCheckUrl) {
        links.push(
            `Check lot or replacement information <a href='${lotCheckUrl}' target='_blank' rel='noopener noreferrer'>on the company support page</a>.`
        );
    }
    for (const reportingUrl of uniqueArray(reportingUrls || [])) {
        const label = /safetyreporting\.hhs\.gov/i.test(reportingUrl)
            ? "Report an adverse event through the FDA Safety Reporting Portal"
            : /medwatch/i.test(reportingUrl)
              ? "Report an adverse event through FDA MedWatch"
              : "Report an adverse event";
        links.push(
            `${label} <a href='${reportingUrl}' target='_blank' rel='noopener noreferrer'>here</a>.`
        );
    }

    if (consumerWebsite && !(reportingUrls || []).includes(consumerWebsite)) {
        const label = /safetyreporting\.hhs\.gov/i.test(consumerWebsite)
            ? "Report an adverse event through the FDA Safety Reporting Portal"
            : /medwatch/i.test(consumerWebsite)
              ? "Report an adverse event through FDA MedWatch"
              : "Review consumer support information";
        links.push(
            `${label} <a href='${consumerWebsite}' target='_blank' rel='noopener noreferrer'>here</a>.`
        );
    }
    if (
        companyWebsite &&
        companyWebsite !== consumerWebsite &&
        companyWebsite !== lotCheckUrl &&
        !(reportingUrls || []).includes(companyWebsite)
    ) {
        const label = /fda\.gov\/medwatch|fda\.gov\/safety\/medwatch/i.test(companyWebsite)
            ? "Report an adverse event through FDA MedWatch"
            : "Visit the company website for product details";
        links.push(
            `${label} <a href='${companyWebsite}' target='_blank' rel='noopener noreferrer'>here</a>.`
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
    const text = String(value || "").trim();
    if (!text) return "";
    return text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .trim();
}

function normalizeMetaDescription(value, fallback) {
    let text = cleanText(value || fallback || "");
    text = text.replace(/\s*\.\.\.$/, "").replace(/\s+…$/, "");
    if (text.length > 170) {
        text = text.slice(0, 167).replace(/\s+\S*$/, "").replace(/[,:;–-]+$/g, "").trim();
    }
    if (text && !/[.!?]$/.test(text)) text += ".";
    return text;
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

async function rewriteAnnouncementForSEOv2({
    title,
    companyName,
    brandName,
    productDescription,
    productType,
    reason,
    rawAnnouncement,
    announcementTables = [],
}) {
    if (!cleanText(rawAnnouncement) || cleanText(rawAnnouncement).length < 40) return "";

    const prompt = `
Rewrite the following FDA/company recall announcement for an informational recall summary. Output must be compact, useful, and easy to scan.

Format rules:
- Output must be valid HTML only (no Markdown). Use tags that are valid inside JSON.
- Use <p>...</p> for each paragraph.
- When the source lists products, lot numbers, expiration dates, or UPCs: return an HTML <table> with <thead><tr><th>...</th></tr></thead> and <tbody><tr><td>...</td></tr></tbody>. One row per product or variant.
- Keep 2-3 short <p> paragraphs for the main summary, then add the <table> for structured product data below when needed.
- No invented facts. Preserve all important details such as lots, dates, UPCs, and quantities. For links use <a href="URL">text</a>.
- If SOURCE_TABLES_JSON is provided, do not recreate, summarize, or replace it with a new table. The script will append exact source tables separately.
- Never output placeholder rows such as "Batch 1", "not specified", or "N/A" unless that exact value appears in the source.

Tone and content:
- Neutral, factual tone. Keep it unique for SEO and useful for readers.
- Make clear the information comes from the company announcement and/or FDA posting.
- Preserve facts. Do NOT include investor language, securities language, forward-looking statements, media boilerplate, or legal disclaimers.
- Focus on recall facts, who is affected, what the risk is, and why it matters.
- Do NOT include step-by-step consumer instructions if they will be covered in a separate action section.
- Do NOT repeat company contact details unless they are essential to understanding the recall.
- Do NOT add repeated source-link callouts like "FDA recall page here" inside the summary.

Context:
Title: ${title}
Company: ${companyName}
Brand: ${brandName}
Product: ${productDescription}
Product Type: ${productType}
Reason: ${reason}

SOURCE_TABLES_JSON:
${JSON.stringify(announcementTables || [])}

Source announcement:
${rawAnnouncement}
`.trim();

    return await callOpenAI(prompt, "rewriteAnnouncement");
}

async function generateConsumerActionTextV2({
    companyName,
    brandName,
    productDescription,
    reason,
    consumerPhone,
    consumerEmail,
    lotCheckUrl,
}) {
    const prompt = `
Write one concise "What You Should Do" paragraph for consumers about this FDA recall.

Rules:
- Neutral and factual.
- Mention checking lot or product details if applicable.
- Mention contacting the company if support details exist.
- Do not invent instructions that are not supported by the provided context.
- Keep it to one short paragraph.
- No markdown.
- Maximum 75 words.
- Do not include legal disclaimers, forward-looking language, or investor information.
- Do not restate the full recall summary or repeat the hazard explanation more than once.
- Do not repeat source-link language like "FDA recall page here".

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

function buildEditorialFallback(data, year) {
    const entity = data.brandName || data.companyName || "The company";
    const product = data.productDescription || "the affected product";
    const reason = data.reason || "the recall issue described in the FDA notice";
    const date = normalizeDate(data.fdaPublishDateTime || data.fdaPublishDateText) || year;
    const contact = buildContactSectionText(data.contacts);
    return {
        title: makeSeoHeadline({
            title: data.title,
            companyName: data.companyName,
            brandName: data.brandName,
            productDescription: data.productDescription,
            reason: data.reason,
        }),
        headline: makeSeoHeadline({
            title: data.title,
            companyName: data.companyName,
            brandName: data.brandName,
            productDescription: data.productDescription,
            reason: data.reason,
        }),
        metaDescription: makeDescription({
            companyName: data.companyName,
            brandName: data.brandName,
            productDescription: data.productDescription,
            reason: data.reason,
            year,
        }),
        quickAnswerHtml: `<p>${escapeHtml(entity)} recalled ${escapeHtml(product)} because ${escapeHtml(reason)}. The FDA notice was published on ${escapeHtml(date)}.</p>`,
        recallSummaryHtml: `<p>${escapeHtml(entity)} announced a recall involving ${escapeHtml(product)}. The recall reason listed by FDA is ${escapeHtml(reason)}.</p>`,
        riskOverviewHtml: `<p>The practical risk depends on whether a consumer has the affected product identified in the FDA notice. Check the product name, package details, batch or lot information, and expiration dates against the official recall details.</p>`,
        whoIsAffectedHtml: `<p>People who bought, used, distributed, or care for someone using ${escapeHtml(product)} may be affected if their product matches the recalled details.</p>`,
        howToIdentifyProductHtml: `<p>Compare the product label with the affected product table and the FDA notice. Look for brand, product name, package size, batch or lot number, UPC, and use-by or expiration date where provided.</p>`,
        whatToDoHtml: `<p>Follow the company and FDA instructions in the official notice. Stop using the product if it matches the recalled details, keep packaging information available, and contact the company using the listed support details.${contact ? ` ${escapeHtml(contact)}` : ""}</p>`,
        healthAndSafetyContextHtml: `<p>This page is informational and based on the FDA-posted company announcement. Consumers with symptoms, adverse reactions, or product-specific medical concerns should contact a qualified health professional or report the issue through FDA reporting channels when appropriate.</p>`,
        sourceTransparencyHtml: `<p>Recalls Atlas summarized the FDA-posted company announcement, preserved the official affected-product table when available, and linked back to the original FDA source.</p>`,
        faq: [
            {
                question: `What product is recalled?`,
                answer: `${product} is listed in the FDA notice.`,
            },
            {
                question: `Why was it recalled?`,
                answer: reason,
            },
            {
                question: `Where can I verify the recall?`,
                answer: `Use the official FDA recall notice linked on this page.`,
            },
        ],
    };
}

function buildSourceBasedEeatMeta({ data, detailUrl, publishedDate, fetchedAt }) {
    return omitEmptyDeep({
        type: "source-based recall brief",
        editorialStandard:
            "FDA/company recall facts are extracted from the official notice; reader-facing explanations are generated from those facts and checked against source fields by script constraints.",
        factualBasis: "Official FDA recall notice and company announcement posted by FDA.",
        officialSource: detailUrl,
        sourceAuthority: "U.S. Food and Drug Administration (FDA)",
        sourcePublishedAt: publishedDate,
        sourceFetchedAt: fetchedAt,
        lastVerifiedAt: fetchedAt,
        exactDataPreserved: [
            "FDA source URL",
            "FDA publish date",
            "company announcement date",
            "company name",
            "brand name",
            "product description",
            "recall reason",
            "affected product tables",
            "contact details",
            "official links",
        ],
        sourceTableCount: Array.isArray(data.announcementTables) ? data.announcementTables.length : 0,
        hasExactAffectedProductTable:
            Array.isArray(data.announcementTables) && data.announcementTables.some((table) => table?.rows?.length),
        limitations:
            "This page is not independent product testing, medical advice, legal advice, or a human clinical review.",
    });
}

async function generateEditorialRecallBrief({ data, detailUrl, year }) {
    const fallback = buildEditorialFallback(data, year);
    const source = {
        title: data.title,
        companyName: data.companyName,
        brandName: data.brandName,
        brandNames: data.brandNames,
        productDescription: data.productDescription,
        productType: data.productType,
        regulatedProducts: data.regulatedProducts,
        reason: data.reason,
        fdaPublishDate: data.fdaPublishDateText,
        fdaPublishDateTime: data.fdaPublishDateTime,
        companyAnnouncementDate: data.companyAnnouncementDateText,
        sourceUrl: detailUrl,
        pageTypeLabel: data.pageTypeLabel,
        disclaimer: data.disclaimer,
        contacts: data.contacts,
        lotCheckUrl: data.lotCheckUrl,
        consumerWebsite: data.consumerWebsite,
        companyWebsite: data.companyWebsite,
        contentCurrentAsOf: data.contentCurrentAsOfText,
        announcementParagraphs: data.announcementParagraphs,
        announcementBullets: data.announcementBullets,
        announcementTables: data.announcementTables,
        rawAnnouncement: data.rawAnnouncement,
    };

    const prompt = `
You create high-quality FDA recall briefs for a U.S. consumer safety website. This is YMYL content.
Return STRICT JSON only. No markdown.

Goal:
- Make the page more useful than the FDA post while staying fully grounded in the FDA/company announcement.
- Improve E-E-A-T through clarity, completeness, source transparency, practical identification guidance, and careful risk context.
- Do not pretend there was a human medical review. Do not claim independent testing.

Hard trust rules:
- Use only SOURCE_JSON.
- Do not invent lot numbers, UPCs, dates, states, illness counts, distribution channels, symptoms, batch numbers, contacts, or URLs.
- Do not create tables. Exact FDA source tables are handled by code.
- Do not output placeholder values like "Batch 1", "Not specified", "N/A", or "unknown" unless those exact values appear in SOURCE_JSON.
- If the source lacks a detail, say how to verify it using the FDA notice or product label instead of filling it in.
- Do not provide medical or legal advice. You may say to contact a healthcare professional when the source or risk context supports it.
- Keep all HTML simple: <p>, <ul>, <li>, <strong>. No <table>, no headings, no scripts.

Return this JSON shape exactly:
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
  "healthAndSafetyContextHtml": "",
  "sourceTransparencyHtml": "",
  "faq": [
    { "question": "", "answer": "" },
    { "question": "", "answer": "" },
    { "question": "", "answer": "" }
  ]
}

Quality requirements:
- title/headline: specific product + hazard, not generic.
- metaDescription: 140-165 characters, complete sentence, no trailing ellipsis.
- quickAnswerHtml: 1 concise paragraph that answers what happened.
- recallSummaryHtml: 2-3 paragraphs explaining product, reason, distribution, reported illnesses/events if present.
- riskOverviewHtml: explain why the hazard matters in plain English, without exaggeration.
- whoIsAffectedHtml: who should check their product.
- howToIdentifyProductHtml: explain exactly which label details to compare, based on source tables/fields.
- whatToDoHtml: concrete consumer steps supported by source details.
- healthAndSafetyContextHtml: general safety context tied to the hazard and product type.
- sourceTransparencyHtml: explain that the page is based on the FDA-posted company announcement, include FDA publish date if present.
- faq: 3-5 useful questions and answers, grounded in source facts.

SOURCE_JSON:
${JSON.stringify(source)}
`.trim();

    const text = await callOpenAI(prompt, "editorialRecallBrief");
    const parsed = parseOpenAIJson(text, fallback);
    const brief = { ...fallback, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    const faq = Array.isArray(brief.faq) ? brief.faq : fallback.faq;
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
        healthAndSafetyContextHtml: cleanHtmlFragment(brief.healthAndSafetyContextHtml || fallback.healthAndSafetyContextHtml),
        sourceTransparencyHtml: cleanHtmlFragment(brief.sourceTransparencyHtml || fallback.sourceTransparencyHtml),
        faq: faq
            .map((item) => ({
                question: cleanText(item?.question || ""),
                answer: cleanText(item?.answer || ""),
            }))
            .filter((item) => item.question && item.answer)
            .slice(0, 5),
    };
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
        }).catch(() => { });

        await page.waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 }).catch(() => { });
        await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: 10000 }).catch(() => { });
        await page.waitForSelector("#datatable tbody tr").catch(() => { });

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
            const announcementTables = [];
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
            function collectTable(tableEl) {
                const tableRows = [...tableEl.querySelectorAll("tr")];
                const grid = [];
                tableRows.forEach((tr, rowIndex) => {
                    if (!grid[rowIndex]) grid[rowIndex] = [];
                    let colIndex = 0;
                    [...tr.querySelectorAll("th, td")].forEach((cell) => {
                        while (grid[rowIndex][colIndex] !== undefined) colIndex++;
                        const value = clean(cell.innerText);
                        const rowspan = Math.max(1, Number.parseInt(cell.getAttribute("rowspan") || "1", 10) || 1);
                        const colspan = Math.max(1, Number.parseInt(cell.getAttribute("colspan") || "1", 10) || 1);
                        for (let r = 0; r < rowspan; r++) {
                            const targetRow = rowIndex + r;
                            if (!grid[targetRow]) grid[targetRow] = [];
                            for (let c = 0; c < colspan; c++) {
                                grid[targetRow][colIndex + c] = value;
                            }
                        }
                        colIndex += colspan;
                    });
                });

                const headerRowEl = tableEl.querySelector("thead tr") || tableRows.find((tr) => tr.querySelector("th"));
                const headerIndex = headerRowEl ? tableRows.indexOf(headerRowEl) : 0;
                let finalHeaders = (grid[headerIndex] || []).map(clean).filter(Boolean);
                let rows = grid
                    .filter((_row, i) => i !== headerIndex && i > headerIndex)
                    .map((row) => (row || []).map(clean))
                    .filter((row) => row.some(Boolean));
                if (!finalHeaders.length && rows.length) {
                    finalHeaders = rows[0].map((_value, i) => `Column ${i + 1}`);
                }
                if (finalHeaders.length && rows.length) {
                    rows = rows.map((row) => finalHeaders.map((_header, i) => clean(row[i] || "")));
                }
                if (finalHeaders.length && rows.length) {
                    announcementTables.push({ headers: finalHeaders, rows });
                }
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
                    } else if (tag === "table") {
                        collectTable(node);
                    } else if (tag === "div") {
                        // All <p> and <ul> between announcement and #recall-photos (including nested, e.g. lot numbers, MedWatch)
                        const allContentNodes = node.querySelectorAll("p, ul, table");
                        allContentNodes.forEach((el) => {
                            if (el.closest("#recall-photos")) return;
                            const t = (el.tagName || "").toLowerCase();
                            if (t === "p") collectParagraph(el);
                            else if (t === "ul") collectList(el);
                            else if (t === "table") collectTable(el);
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
            const reportingUrls = [];

            for (const href of allLinks) {
                const lower = href.toLowerCase();
                const isReportingUrl =
                    /safetyreporting\.hhs\.gov|fda\.gov\/medwatch|fda\.gov\/safety\/medwatch|medwatch\/report/i.test(
                        lower
                    );

                if (isReportingUrl) {
                    reportingUrls.push(href);
                    if (!consumerWebsite) consumerWebsite = href;
                    continue;
                }

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
                    !/fda\.gov/i.test(lower) &&
                    !/safetyreporting\.hhs\.gov/i.test(lower) &&
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
                announcementTables,
                aboutCompanyText,

                contacts,

                lotCheckUrl,
                consumerWebsite,
                companyWebsite,
                reportingUrls: uniqueArray(reportingUrls),

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
        announcementTables: Array.isArray(detailData.announcementTables) ? detailData.announcementTables : [],
        aboutCompanyText: cleanText(detailData.aboutCompanyText),

        contacts: detailData.contacts || {},

        lotCheckUrl: normalizeUrl(detailData.lotCheckUrl),
        consumerWebsite: normalizeUrl(detailData.consumerWebsite),
        companyWebsite: normalizeUrl(detailData.companyWebsite),
        reportingUrls: uniqueArray(detailData.reportingUrls || []).map(normalizeUrl).filter(Boolean),

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

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildAnnouncementTablesHtml(tables) {
    if (!Array.isArray(tables) || !tables.length) return "";
    return tables
        .map((table) => {
            const headers = Array.isArray(table.headers) ? table.headers.map(cleanText).filter(Boolean) : [];
            const rows = Array.isArray(table.rows)
                ? table.rows
                      .map((row) => (Array.isArray(row) ? row.map(cleanText) : []))
                      .filter((row) => row.some(Boolean))
                : [];
            if (!headers.length || !rows.length) return "";
            const thead = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>`;
            const tbody = `<tbody>${rows
                .map((row) => {
                    const cells = headers.map((_h, i) => `<td>${escapeHtml(row[i] || "")}</td>`).join("");
                    return `<tr>${cells}</tr>`;
                })
                .join("")}</tbody>`;
            return `<table>${thead}${tbody}</table>`;
        })
        .filter(Boolean)
        .join("\n");
}

function buildContentSections({
    data,
    rewrittenSummary,
    consumerActionText,
    editorialBrief,
    authorityLinks,
}) {
    const sections = [];

    const exactTablesHtml = buildAnnouncementTablesHtml(data.announcementTables);
    const quickAnswer = editorialBrief?.quickAnswerHtml || "";
    const summaryText = editorialBrief?.recallSummaryHtml || rewrittenSummary || buildFallbackRecallSummary(data);
    if (quickAnswer) {
        sections.push(
            omitEmptyDeep({
                subtitle: "Quick Answer",
                text: quickAnswer,
            })
        );
    }
    sections.push(
        omitEmptyDeep({
            subtitle: "Recall Summary",
            text: exactTablesHtml ? `${summaryText}\n${exactTablesHtml}` : summaryText,
        })
    );

    const recallFacts = omitEmptyDeep({
        company: cleanText(data.companyName || ""),
        brand: cleanText(data.brandName || ""),
        product: cleanText(data.productDescription || ""),
        productType: cleanText(data.productType || ""),
        reason: cleanText(data.reason || ""),
        affectedProductTables: data.announcementTables,
    });
    if (Object.keys(recallFacts).length) {
        sections.push(
            omitEmptyDeep({
                subtitle: "What Was Recalled",
                facts: recallFacts,
            })
        );
    }

    if (editorialBrief?.howToIdentifyProductHtml) {
        sections.push(
            omitEmptyDeep({
                subtitle: "How to Identify the Recalled Product",
                text: editorialBrief.howToIdentifyProductHtml,
            })
        );
    }

    if (editorialBrief?.whatToDoHtml || consumerActionText) {
        sections.push(
            omitEmptyDeep({
                subtitle: "What You Should Do",
                text: editorialBrief?.whatToDoHtml || consumerActionText,
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
                    subtitle: "What You Should Do",
                    text: fallbackText,
                })
            );
        }
    }

    if (editorialBrief?.riskOverviewHtml) {
        sections.push(
            omitEmptyDeep({
                subtitle: "Risk Overview",
                text: editorialBrief.riskOverviewHtml,
            })
        );
    }

    if (editorialBrief?.whoIsAffectedHtml) {
        sections.push(
            omitEmptyDeep({
                subtitle: "Who May Be Affected",
                text: editorialBrief.whoIsAffectedHtml,
            })
        );
    }

    if (editorialBrief?.healthAndSafetyContextHtml) {
        sections.push(
            omitEmptyDeep({
                subtitle: "Health and Safety Context",
                text: editorialBrief.healthAndSafetyContextHtml,
            })
        );
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

    if (Array.isArray(editorialBrief?.faq) && editorialBrief.faq.length) {
        sections.push(
            omitEmptyDeep({
                subtitle: "Frequently Asked Questions",
                faq: editorialBrief.faq,
            })
        );
    }

    sections.push(
        omitEmptyDeep({
            subtitle: "Source and Verification",
            text:
                editorialBrief?.sourceTransparencyHtml ||
                cleanText(
                    `According to the U.S. Food and Drug Administration (FDA), this recall notice was published on ${normalizeDate(data.fdaPublishDateTime || data.fdaPublishDateText) || "the FDA recall page"
                    }.`
                ),
            authorityLinks,
        })
    );

    return sections
        .map((section) => omitEmptyDeep(section))
        .filter((section) =>
            cleanText(section.text) ||
            (section.facts && Object.keys(section.facts).length) ||
            (Array.isArray(section.faq) && section.faq.length) ||
            (Array.isArray(section.authorityLinks) && section.authorityLinks.length)
        );
}

// ======================================================
// MAIN
// ======================================================

function normalizeSourceUrl(url) {
    if (!url || typeof url !== "string") return "";
    const u = url.trim().replace(/\/+$/, "");
    if (!u) return "";
    try {
        const parsed = new URL(u);
        parsed.hash = "";
        return parsed.toString().replace(/\/+$/, "");
    } catch {
        return u;
    }
}

/** True when list row date is strictly before newest date in recalls.json (ISO-like compare). */
function isRowOlderThanStored(rowDate, newestExistingDate) {
    if (!newestExistingDate || !rowDate) return false;
    return rowDate < newestExistingDate;
}

/**
 * True when the first `n` FDA list rows (with detail links) are all already in recalls.json
 * by sourceUrl. If the page has fewer than `n` URL rows, every URL row on the page must be stored.
 */
function fdaFirstNRowsAllAlreadyStored(fdaRows, processedUrls, n) {
    const fdaWithUrl = fdaRows.filter((r) => r.detailUrl);
    if (fdaWithUrl.length === 0) return false;
    if (fdaWithUrl.length < n) {
        return fdaWithUrl.every((r) => processedUrls.has(normalizeSourceUrl(r.detailUrl)));
    }
    const head = fdaWithUrl.slice(0, n);
    return head.every((r) => processedUrls.has(normalizeSourceUrl(r.detailUrl)));
}

(async () => {
    if (FIX_SORT_ORDER) {
        const apply = process.argv.includes("--apply");
        await runFixSortOrderMode(apply);
        return;
    }

    const results = safeReadJson(JSON_PATH, []);
    const imageMap = safeReadJson(IMAGE_MAP_PATH, {});
    const storedHashes = safeReadJson(HASH_PATH, []);
    const processedHashes = new Set(
        Array.isArray(storedHashes)
            ? storedHashes
            : storedHashes && typeof storedHashes === "object"
              ? Object.keys(storedHashes)
              : []
    );
    const backfillCapacity = Math.max(0, MAX_TOTAL - results.length);
    const runLimit = results.length >= MAX_TOTAL ? MAX_RECORDS : Math.min(MAX_RECORDS, backfillCapacity);

    const processedUrls = new Set();
    for (const item of results) {
        const u = normalizeSourceUrl(item.sourceUrl || item.source_url);
        if (u) {
            processedUrls.add(u);
            processedHashes.add(buildRecallHash(u));
        }
        if (item._contentHash) processedHashes.add(String(item._contentHash));
    }
    const existingSlugs = new Set(
        results.map((item) => item.id || item.slug).filter(Boolean)
    );

    let maxSort = START_SORT_ORDER;
    let minSort = START_SORT_ORDER + 1;
    const sortOrders = new Set(
        results
            .map((item) => (typeof item.sortOrder === "number" ? item.sortOrder : null))
            .filter((n) => n != null)
    );
    if (sortOrders.size > 0) {
        maxSort = Math.max(...sortOrders);
        minSort = Math.min(...sortOrders);
        const gaps = [];
        for (let i = minSort; i <= maxSort; i++) {
            if (!sortOrders.has(i)) gaps.push(i);
        }
        if (gaps.length > 0) {
            log(`SortOrder gaps (missing): ${gaps.join(", ")}`);
        }
    }

    // Newest date among existing recalls — list rows before this are "old" and end the scan.
    // sourceUrl (detail URL) is the second check: already in JSON → skip.
    const newestExistingDate = results.reduce((best, r) => {
        const d = r.fdaPublishDateTime || r.fdaPublishDate ||
            r.companyAnnouncementDateTime || r.datePublished || "";
        return d > best ? d : best;
    }, "");

    printRunSummary({
        existingCount: results.length,
        maxRecords: MAX_RECORDS,
        maxTotal: MAX_TOTAL,
        runLimit,
        imageBaseDir: IMAGE_BASE_DIR,
    });
    verboseLog(`Loaded unique sourceUrls: ${processedUrls.size}`);
    verboseLog(`Backfill capacity: ${backfillCapacity}`);
    verboseLog(`Newest existing date: ${newestExistingDate || "(none)"} (vs FDA table + sourceUrl)`);
    if (runLimit <= 0) {
        log(`MAX_TOTAL reached (${results.length}/${MAX_TOTAL}); no backfill or newer scrape requested.`);
        saveAll(results, imageMap, processedHashes);
        progress.finish(`DONE · max total reached · ${results.length} total in file`);
        return;
    }

    progress.update({ phase: "Start", current: 0, total: runLimit, status: "Launching browser..." });

    const browser = await chromium.launch({
        headless: HEADLESS,
        slowMo: HEADLESS ? 0 : 150,
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
    await page.waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 }).catch(() => { });
    await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: 10000 }).catch(() => { });
    await page.waitForSelector("#datatable tbody tr");
    log("Set DataTable page size to 100 and Terminated Recall filter to No");

    // Pass 1: walk FDA table newest → older. Before the first stored row, candidates are true
    // new recalls and get sortOrder above maxSort. After stored rows, candidates are backfill
    // rows and get sortOrder below minSort. For a fresh build, the top row starts at 300.
    const pendingCandidates = [];
    const queuedHashes = new Set();
    const hasExistingResults = results.length > 0;
    let seenStoredRecall = false;
    let pageIndex = 1;
    let hasNext = true;

    while (hasNext && pendingCandidates.length < runLimit) {
        progress.update({
            phase: "Scan",
            current: pendingCandidates.length,
            total: runLimit,
            status: `Page ${pageIndex}…`,
        });
        verboseLog(`Reading DataTable page ${pageIndex} (enumerate new rows)...`);

        await waitForDatatableReady(page);

        const rows = await extractListRows(page);
        verboseLog(`Rows found on page ${pageIndex}: ${rows.length}`);

        if (
            pageIndex === 1 &&
            backfillCapacity <= 0 &&
            fdaFirstNRowsAllAlreadyStored(rows, processedUrls, EARLY_EXIT_TOP_N)
        ) {
            log(
                `FDA first ${EARLY_EXIT_TOP_N} row(s) (or full page if shorter) are already in recalls.json — nothing new, skipping table scan.`
            );
            hasNext = false;
            break;
        }

        let hitBackfillLimit = false;
        for (const listRow of rows) {
            if (pendingCandidates.length >= runLimit) break;

            const rowDate = listRow.listDateTime || listRow.listDateText || "";
            const detailUrl = listRow.detailUrl;
            if (!detailUrl) continue;

            if (newestExistingDate && !rowDate) {
                verboseLog("Skip row with empty list date (recalls.json has a newest date).");
                continue;
            }

            const normalizedDetailUrl = normalizeSourceUrl(detailUrl);
            const recallHash = buildRecallHash(normalizedDetailUrl || detailUrl);
            if (normalizedDetailUrl && processedUrls.has(normalizedDetailUrl)) {
                seenStoredRecall = true;
                verboseLog(`Skip already stored (sourceUrl): ${detailUrl}`);
                continue;
            }
            if (recallHash && processedHashes.has(recallHash)) {
                seenStoredRecall = true;
                verboseLog(`Skip already processed (hash): ${detailUrl}`);
                continue;
            }
            if (recallHash && queuedHashes.has(recallHash)) {
                verboseLog(`Skip duplicate queued this run: ${detailUrl}`);
                continue;
            }

            const candidateKind = !hasExistingResults ? "fresh" : seenStoredRecall ? "backfill" : "newer";
            const backfillQueued = pendingCandidates.filter((item) => item.candidateKind !== "newer").length;
            if (candidateKind === "backfill" && backfillQueued >= backfillCapacity) {
                hitBackfillLimit = true;
                break;
            }

            pendingCandidates.push({ listRow, detailUrl, normalizedDetailUrl, recallHash, candidateKind });
            if (recallHash) queuedHashes.add(recallHash);
        }

        if (hitBackfillLimit) {
            if (pendingCandidates.length === 0) {
                log("Reached archive backfill limit; nothing new to add.");
            } else {
                log("Reached archive backfill limit; stopping table scan.");
            }
            hasNext = false;
            break;
        }

        if (pendingCandidates.length >= runLimit) {
            log(`Stopping scan: run limit (${runLimit}) new rows queued.`);
            hasNext = false;
            break;
        }

        const moved = await clickNextDatatablePage(page);
        if (!moved) {
            hasNext = false;
            log("No more DataTable pages.");
            break;
        }

        pageIndex += 1;
    }

    const N = pendingCandidates.length;
    if (N === 0) {
        log("No new recalls to ingest (list date + sourceUrl checks).");
        saveAll(results, imageMap, processedHashes);
        await browser.close();
        progress.finish(`DONE · 0 new · ${results.length} total in file`);
        log("DONE");
        return;
    }

    const freshCandidates = pendingCandidates.filter((item) => item.candidateKind === "fresh");
    const newerCandidates = pendingCandidates.filter((item) => item.candidateKind === "newer");
    const backfillCandidates = pendingCandidates.filter((item) => item.candidateKind === "backfill");

    for (let i = 0; i < freshCandidates.length; i++) {
        freshCandidates[i].assignedSortOrder = START_SORT_ORDER - i;
    }
    for (let i = 0; i < newerCandidates.length; i++) {
        newerCandidates[i].assignedSortOrder = maxSort + newerCandidates.length - i;
    }
    for (let i = 0; i < backfillCandidates.length; i++) {
        backfillCandidates[i].assignedSortOrder = minSort - 1 - i;
    }

    const assignedSortOrders = pendingCandidates
        .map((item) => item.assignedSortOrder)
        .filter((n) => typeof n === "number");
    log(
        `New recalls to ingest: ${N} — sortOrder ${Math.max(...assignedSortOrders)} (newest in run) … ${Math.min(...assignedSortOrders)} (oldest in run)`
    );

    let savedThisRun = 0;
    progress.update({ phase: "Scrape", current: 0, total: N, status: "Detail pages…" });

    for (let ci = 0; ci < pendingCandidates.length; ci++) {
        const cand = pendingCandidates[ci];
        const { listRow, detailUrl, normalizedDetailUrl, assignedSortOrder, recallHash } = cand;
        const step = ci + 1;
        const shortUrl = detailUrl.replace(/^https?:\/\//, "").slice(0, 35);
        updateRecallStage(step, N, "Opening detail page", shortUrl + "…");
        printRecallHeader({ step, total: N, sortOrder: assignedSortOrder, detailUrl });

        const detailPage = await context.newPage();
        detailPage.setDefaultNavigationTimeout(NAV_TIMEOUT);
        detailPage.setDefaultTimeout(NAV_TIMEOUT);

        try {
            updateRecallStage(step, N, "Extracting FDA detail", shortUrl + "…");
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
            const folderName = `${assignedSortOrder}-${slug}`;

            printRecallIdentity({
                title: merged.title,
                slug,
                folderName,
                companyName: merged.companyName,
                productDescription: merged.productDescription,
                reason: merged.reason,
            });

            updateRecallStage(step, N, "Generating editorial brief", slug);
            const editorialBrief = await generateEditorialRecallBrief({
                data: merged,
                detailUrl,
                year,
            });

            await randomDelay("after editorial brief generation");

            const savedImages = [];
            if (merged.images && merged.images.length > 0) {
                updateRecallStage(step, N, `Processing images 0/${merged.images.length}`, slug);
                for (const imageUrl of merged.images) {
                    updateRecallStage(
                        step,
                        N,
                        `Processing images ${savedImages.length + 1}/${merged.images.length}`,
                        slug
                    );
                    const localPath = await processImage(imageUrl, folderName, imageMap);
                    if (localPath) savedImages.push(localPath);
                    await randomDelay("between images");
                }
            }

            const canonicalUrl = makeCanonicalUrl(slug);
            const fetchedAt = nowISO();
            const authorityLinks = buildAuthorityLinks(
                detailUrl,
                merged.consumerWebsite,
                merged.companyWebsite,
                merged.lotCheckUrl,
                merged.reportingUrls
            );

            const contentSections = buildContentSections({
                data: merged,
                rewrittenSummary: editorialBrief.recallSummaryHtml,
                consumerActionText: editorialBrief.whatToDoHtml,
                editorialBrief,
                authorityLinks,
            });

            const description = editorialBrief.metaDescription || makeDescription({
                companyName: merged.companyName,
                brandName: merged.brandName,
                productDescription: merged.productDescription,
                reason: merged.reason,
                year,
            });
            const seoHeadline = editorialBrief.headline || makeSeoHeadline({
                title: merged.title,
                companyName: merged.companyName,
                brandName: merged.brandName,
                productDescription: merged.productDescription,
                reason: merged.reason,
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
                schemaVersion: "recall-v2",

                id: slug,
                slug,
                _contentHash: recallHash,
                sortOrder: assignedSortOrder,
                canonicalUrl,
                mainEntityOfPage: canonicalUrl,
                headline: seoHeadline,
                author: {
                    "@type": "Organization",
                    name: "Recalls Atlas",
                    url: SITE_BASE_URL,
                },
                publisher: {
                    "@type": "Organization",
                    name: "Recalls Atlas",
                    logo: {
                        "@type": "ImageObject",
                        url: `${SITE_BASE_URL}/logo.png`,
                    },
                },
                datePublished: publishedDate,
                dateModified: todayISODate(),
                image: buildPrimaryImageObject(savedImages, seoHeadline),
                description,
                keywords,
                content: contentSections,

                sourceUrl: detailUrl,
                sourceAuthority: "FDA",
                sourcePublishedAt: publishedDate,
                sourceFetchedAt: fetchedAt,
                scrapedAt: fetchedAt,
                eeatMeta: buildSourceBasedEeatMeta({
                    data: merged,
                    detailUrl,
                    publishedDate,
                    fetchedAt,
                }),

                pageTypeLabel: merged.pageTypeLabel,
                disclaimer: merged.disclaimer,

                title: editorialBrief.title || merged.title,
                editorialBrief,

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
                reportingUrls: merged.reportingUrls,

                contacts: merged.contacts,

                contentCurrentAsOf: merged.contentCurrentAsOfText,
                contentCurrentAsOfDateTime: normalizeDateTime(merged.contentCurrentAsOfDateTime),
                sourceTables: merged.announcementTables,

                images: savedImages,
                rawImageSources: merged.images,
            });

            if (!savedImages.length) {
                delete article.images;
                delete article.rawImageSources;
            }

            results.push(article);
            if (normalizedDetailUrl) processedUrls.add(normalizedDetailUrl);
            if (recallHash) processedHashes.add(recallHash);
            savedThisRun += 1;
            saveAll(results, imageMap, processedHashes);
            progress.update({ phase: "Scrape", current: step, total: N, status: `Saved ${slug}` });
            if (savedThisRun % 5 === 0) {
                log(`Checkpoint: saved after ${savedThisRun} recalls.`);
            }
            printRecallDone({
                step,
                total: N,
                sortOrder: assignedSortOrder,
                slug,
                imageCount: savedImages.length,
                totalSaved: results.length,
            });

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

    saveAll(results, imageMap, processedHashes);
    await browser.close();
    progress.finish(`DONE · ${savedThisRun} saved this run, ${results.length} total`);
    log("DONE");
})();
