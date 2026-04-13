/**
 * checkTerminated.js
 *
 * Checks recalls.json against an FDA "Terminated Recalls" Excel export and
 * marks matching records as terminated.
 *
 * Match strategy (deterministic):
 *   Product: JSON facts.product or productDescription ↔ Excel Product-Description (norm).
 *   Date:    JSON datePublished ↔ Excel Date.
 *
 * Usage (from backend/):
 *   node scripts/scrape/checkTerminated.js                              # uses local .xlsx if present
 *   node scripts/scrape/checkTerminated.js path/to/export.xlsx
 *   node scripts/scrape/checkTerminated.js --fetch                      # download from FDA, then match
 *   node scripts/scrape/checkTerminated.js --fetch --dry-run --mongo
 *
 * Flags:
 *   --fetch     Open FDA listing, Terminated=Yes, 100/page, Export Excel → scripts/fda-terminated-export.xlsx
 *   --mongo     Push updates to MongoDB (needs MONGODB_URI)
 *   --dry-run   Print matches without saving
 *
 * Env: HEADLESS=false to show the browser during --fetch (scripts/.env or backend/.env)
 */

const fs = require("fs");
const path = require("path");
const SCRIPTS_ROOT = path.join(__dirname, "..");
const BACKEND_ROOT = path.join(SCRIPTS_ROOT, "..");
require("dotenv").config({
  path: fs.existsSync(path.join(SCRIPTS_ROOT, ".env"))
    ? path.join(SCRIPTS_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});
const xlsx = require("xlsx");
const { chromium } = require("playwright");

// ─── Config ───────────────────────────────────────────────────────────────────

/** recalls.json now lives in the same directory as the scripts. */
const JSON_PATH = path.join(SCRIPTS_ROOT, "recalls.json");

/** Timestamped downloads go here — one file per run, keep history. */
const DOWNLOADS_DIR = path.join(SCRIPTS_ROOT, "Terminated-Excel");

const FDA_LIST_URL =
  "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";
const NAV_TIMEOUT = 120000;
const POST_FILTER_WAIT_MS = 2500;

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const WITH_MONGO = flags.includes("--mongo");
const DRY_RUN = flags.includes("--dry-run");
const FETCH = flags.includes("--fetch");

const SCRIPTS_DIR = SCRIPTS_ROOT;
const DEFAULT_NAME = "recalls-market-withdrawals-safety-alert";

/** Build a serial+timestamp filename, e.g. (1) 3-31-2026 2-30PM.xlsx */
function buildTimestampedXlsxPath() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }

  const existing = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".xlsx"));
  const nextSerial = existing.length + 1;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const h24 = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  const hour = h12;
  return path.join(
    DOWNLOADS_DIR,
    `(${nextSerial}) ${month}-${day}-${year} ${hour}-${minutes}${ampm}.xlsx`
  );
}

/** Return the most recent .xlsx in downloads/, or null if none. */
function latestDownloadedXlsx() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return null;
  const files = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((f) => f.endsWith(".xlsx"))
    .map((name) => {
      const full = path.join(DOWNLOADS_DIR, name);
      const stat = fs.statSync(full);
      return { name, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files.length ? path.join(DOWNLOADS_DIR, files[0].name) : null;
}

const HEADLESS = process.env.HEADLESS !== "false";

// ─── Terminal UI ─────────────────────────────────────────────────────────────

const C = {
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function uiHeader(title) {
  const line = "═".repeat(52);
  console.log(`\n${C.cyan}${C.bold}  ${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title.padEnd(52)}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${line}${C.reset}\n`);
}

function uiPhase(n, total, label) {
  const step = `${n}/${total}`;
  console.log(`  ${C.cyan}▸${C.reset} ${C.bold}[${step}]${C.reset} ${label}`);
}

function uiOk(msg) {
  console.log(`     ${C.green}✓${C.reset} ${msg}`);
}

function uiInfo(msg) {
  console.log(`     ${C.dim}${msg}${C.reset}`);
}

function uiSummary(lines) {
  console.log(`\n  ${C.bold}Summary${C.reset}`);
  lines.forEach(([k, v]) => {
    console.log(`     ${C.dim}${k}:${C.reset} ${v}`);
  });
  console.log("");
}

function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  console.log(`[${ts}] ${msg}`);
}

// ─── Match helpers ────────────────────────────────────────────────────────────

function norm(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toIsoDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const m = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return String(val).slice(0, 10);
}

function getJsonProductDescription(recall) {
  if (recall && Array.isArray(recall.content)) {
    const wwr = recall.content.find(
      (s) =>
        s &&
        s.subtitle === "What Was Recalled" &&
        s.facts &&
        typeof s.facts.product === "string" &&
        s.facts.product.trim()
    );
    if (wwr) return wwr.facts.product.trim();
  }
  return String(recall?.productDescription || "").trim();
}

function getJsonMatchDate(recall) {
  return (recall?.datePublished || "").slice(0, 10);
}

// ─── Playwright (FDA download) ────────────────────────────────────────────────

async function gotoWithRetry(page, url, waitSelector) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      if (waitSelector) await page.waitForSelector(waitSelector, { timeout: NAV_TIMEOUT });
      return true;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

async function waitForDatatableReady(page) {
  await page.waitForSelector("#datatable", { timeout: NAV_TIMEOUT });
  await page.waitForSelector("#datatable tbody tr", { timeout: NAV_TIMEOUT });
  await page
    .waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 })
    .catch(() => { });
  await page
    .waitForSelector("#datatable_processing", { state: "hidden", timeout: NAV_TIMEOUT })
    .catch(() => { });
}

/** Ensure the downloads directory exists before writing into it. */
function ensureDownloadsDir() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    uiOk(`Created downloads dir: ${DOWNLOADS_DIR}`);
  }
}

async function downloadFdaTerminatedExcel(destPath) {
  uiHeader("FDA · Download terminated recalls Excel");
  uiPhase(1, 4, "Launching browser…");

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 80 });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1400, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(NAV_TIMEOUT);

  try {
    uiPhase(2, 4, "Opening FDA recalls listing…");
    const ok = await gotoWithRetry(page, FDA_LIST_URL, "#datatable");
    if (!ok) throw new Error("Could not load FDA listing.");

    await waitForDatatableReady(page);
    uiOk("Table ready");

    uiPhase(3, 4, "Filters: 100 rows · Terminated Recall = Yes…");
    await page.selectOption("select.form-control.input-sm", "100");
    await page.selectOption("#edit-field-terminated-recall", "1");
    await page.waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 }).catch(() => { });
    await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: NAV_TIMEOUT }).catch(() => { });
    await page.waitForSelector("#datatable tbody tr");
    uiInfo(`Waiting ${POST_FILTER_WAIT_MS}ms for table to settle…`);
    await new Promise((r) => setTimeout(r, POST_FILTER_WAIT_MS));
    await waitForDatatableReady(page);
    uiOk("Filters applied");

    uiPhase(4, 4, "Export Excel…");
    const exportBtn = page.getByRole("button", { name: /export excel/i });
    await exportBtn.waitFor({ state: "visible", timeout: 30000 });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 120000 }),
      exportBtn.click(),
    ]);
    await download.saveAs(destPath);
    const stat = fs.statSync(destPath);
    uiOk(`Saved ${(stat.size / 1024).toFixed(1)} KB → ${destPath}`);
  } finally {
    await browser.close();
  }

  return destPath;
}

// ─── Resolve Excel path ───────────────────────────────────────────────────────

function resolveXlsxPath() {
  // --fetch: always generate a fresh timestamped file in downloads/
  if (FETCH) return buildTimestampedXlsxPath();
  // Explicit path passed as argument
  if (args[0]) return path.resolve(args[0]);
  // Default behavior: always use a fresh downloaded file for this run.
  return buildTimestampedXlsxPath();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("recalls.json not found:", JSON_PATH);
    process.exit(1);
  }

  let xlsxPath = resolveXlsxPath();

  // If no explicit file path is provided, always fetch a fresh export.
  const shouldFetch = FETCH || !args[0];

  if (shouldFetch) {
    ensureDownloadsDir();
    await downloadFdaTerminatedExcel(xlsxPath);
    uiInfo(`Saved as: ${path.basename(xlsxPath)}`);
  } else if (!fs.existsSync(xlsxPath)) {
    console.error("Excel file not found:", xlsxPath);
    process.exit(1);
  }

  uiHeader("Match · Excel ↔ recalls.json");

  log(`Loading Excel: ${xlsxPath}`);
  const workbook = xlsx.readFile(xlsxPath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const recalls = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

  uiSummary([
    ["Excel rows", String(rows.length)],
    ["recalls.json", String(recalls.length)],
  ]);

  const lookup = new Map();
  recalls.forEach((r, i) => {
    const date = getJsonMatchDate(r);
    const product = norm(getJsonProductDescription(r));
    if (date && product) lookup.set(`${date}|${product}`, i);
  });
  uiOk(`Lookup keys: ${lookup.size}`);

  const changes = [];
  let scanned = 0;
  /** Excel row matched date+product in JSON but recall already has terminated: true */
  let matchedAlreadyTerminated = 0;
  const alreadyTerminatedMatches = [];

  for (const row of rows) {
    const excelDate = toIsoDate(row["Date"]);
    const excelProduct = norm(row["Product-Description"] || "");
    const excelBrand = String(row["Brand-Names"] || "").trim();
    scanned++;
    if (!excelDate || !excelProduct) continue;

    const key = `${excelDate}|${excelProduct}`;
    const idx = lookup.get(key);
    if (idx === undefined) continue;

    const record = recalls[idx];
    if (record.terminated === true) {
      matchedAlreadyTerminated++;
      alreadyTerminatedMatches.push({
        idx,
        id: record.id || record.slug,
        sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : null,
        sourceUrl: String(record.sourceUrl || ""),
      });
      continue;
    }

    const jsonProductRaw = getJsonProductDescription(record);
    changes.push({
      idx,
      id: record.id || record.slug,
      sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : null,
      sourceUrl: String(record.sourceUrl || ""),
      product: jsonProductRaw,
      excelBrand,
      excelDate,
    });
  }

  uiHeader("Results");
  console.log(`  ${C.bold}Excel rows scanned:${C.reset} ${scanned}`);
  console.log(
    `  ${C.bold}Excel ↔ JSON matches (already marked terminated):${C.reset} ${matchedAlreadyTerminated}`
  );
  console.log(`  ${C.bold}New terminated matches (will update JSON):${C.reset} ${changes.length}\n`);

  if (alreadyTerminatedMatches.length > 0) {
    log("Matches already marked terminated:");
    alreadyTerminatedMatches.forEach((m) => {
      const sortStr = m.sortOrder != null ? String(m.sortOrder) : "(no sortOrder)";
      log(`  [already TERMINATED] sortOrder ${sortStr}  id ${m.id}`);
      log(`    sourceUrl: ${m.sourceUrl || "(none)"}`);
    });
  }

  if (changes.length === 0) {
    if (matchedAlreadyTerminated > 0) {
      console.log(
        `  ${C.dim}No file changes: every matching recall already has ${C.reset}${C.bold}terminated: true${C.reset}${C.dim} (e.g. you ran this before).${C.reset}\n`
      );
    } else {
      log("No Excel rows matched date+product in recalls.json — nothing to mark.");
    }
    process.exit(0);
  }

  changes.forEach((c) => {
    const sortStr = c.sortOrder != null ? String(c.sortOrder) : "(no sortOrder)";
    log(`  [ongoing → TERMINATED] sortOrder ${sortStr}  id ${c.id}`);
    log(`    sourceUrl: ${c.sourceUrl || "(none)"}`);
    log(`    product: ${c.product}`);
    log(`    date: ${c.excelDate}  brand: ${c.excelBrand}`);
  });

  if (DRY_RUN) {
    log("\n--dry-run: no changes saved.");
    process.exit(0);
  }

  const checkedAt = new Date().toISOString();
  for (const c of changes) {
    recalls[c.idx].terminated = true;
    recalls[c.idx].terminatedCheckedAt = checkedAt;
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(recalls, null, 2), "utf8");
  log(`\nSaved ${changes.length} update(s) to recalls.json`);

  if (WITH_MONGO) {
    uiHeader("MongoDB");
    const { getDb, close } = require("../../database/mongodb");
    const db = await getDb();
    const coll = db.collection("recalls");
    const mongoFailures = [];

    for (const c of changes) {
      const slug = recalls[c.idx].slug || recalls[c.idx].id;
      if (!slug) {
        mongoFailures.push({ id: c.id, reason: "missing slug/id" });
        continue;
      }

      const res = await coll.updateOne(
        { slug },
        { $set: { terminated: true, terminatedCheckedAt: checkedAt } }
      );
      if (res.matchedCount !== 1) {
        mongoFailures.push({ id: c.id, slug, reason: `matchedCount=${res.matchedCount}` });
        continue;
      }
      uiOk(slug);
    }
    await close();
    if (mongoFailures.length > 0) {
      console.error("MongoDB sync had unmatched updates:", mongoFailures.slice(0, 10));
      throw new Error(`MongoDB sync failed for ${mongoFailures.length} record(s).`);
    }
    log("MongoDB sync done.");
  }

  console.log(`\n  ${C.green}${C.bold}Done.${C.reset}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
