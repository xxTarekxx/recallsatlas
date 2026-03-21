/**
 * checkTerminated.js
 *
 * Checks recalls.json against a downloaded FDA "Terminated Recalls" Excel
 * export and marks any matching records as terminated.
 *
 * Match strategy (no AI, fully deterministic):
 *   Product: JSON `content[]` → "What Was Recalled" → `facts.product` when present,
 *            otherwise top-level `productDescription` (legacy). Compared to Excel
 *            `Product-Description` (normalized, case-insensitive).
 *   Date:    Excel `Date` must equal JSON `datePublished` (YYYY-MM-DD first 10 chars).
 *   Both product and date must match to update a record.
 *
 * How to get the Excel file:
 *   1. Go to https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts
 *   2. Set "Terminated Recall" filter to "Yes"
 *   3. Click "Export Excel"
 *   4. Save the file and pass its path as the first argument
 *
 * Usage (run from backend/):
 *   node scripts/checkTerminated.js path/to/export.xlsx
 *   node scripts/checkTerminated.js path/to/export.xlsx --mongo
 *   node scripts/checkTerminated.js path/to/export.xlsx --dry-run
 *
 * Flags:
 *   --mongo     Also push updates to MongoDB (requires MONGODB_URI in .env)
 *   --dry-run   Print matches without saving anything
 */

require("dotenv").config();

const fs   = require("fs");
const path = require("path");
const xlsx = require("xlsx");

// ─── Config ───────────────────────────────────────────────────────────────────

const DATA_DIR  = path.resolve(__dirname, "..", "data");
const JSON_PATH = path.join(DATA_DIR, "recalls.json");

const args       = process.argv.slice(2).filter(a => !a.startsWith("--"));
const flags      = process.argv.slice(2).filter(a => a.startsWith("--"));
const WITH_MONGO = flags.includes("--mongo");
const DRY_RUN    = flags.includes("--dry-run");

// Default: look for the Excel file in the same directory as this script.
// Tries with and without .xlsx extension so both work.
const SCRIPTS_DIR = __dirname;
const DEFAULT_NAME = "recalls-market-withdrawals-safety-alert";
const XLSX_PATH = args[0]
  || (fs.existsSync(path.join(SCRIPTS_DIR, DEFAULT_NAME + ".xlsx"))
      ? path.join(SCRIPTS_DIR, DEFAULT_NAME + ".xlsx")
      : path.join(SCRIPTS_DIR, DEFAULT_NAME));

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  console.log(`[${ts}] ${msg}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize a string for comparison: lowercase, collapse whitespace */
function norm(v) {
  return String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Convert Excel date value to YYYY-MM-DD string.
 * xlsx parses dates as JS Date objects when cellDates:true is set.
 * Falls back to parsing MM/DD/YYYY strings.
 */
function toIsoDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  // MM/DD/YYYY string
  const m = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return String(val).slice(0, 10);
}

/** Prefer structured facts.product; else legacy productDescription. */
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

/** JSON publish date used for matching (same day as Excel Date column). */
function getJsonMatchDate(recall) {
  return (recall?.datePublished || "").slice(0, 10);
}

// ─── Validate inputs ──────────────────────────────────────────────────────────

if (!XLSX_PATH || !fs.existsSync(XLSX_PATH)) {
  console.error("Excel file not found. Either:");
  console.error(`  1. Place it in scripts/ named "${DEFAULT_NAME}.xlsx"`);
  console.error("  2. Pass the path as an argument: node scripts/checkTerminated.js path/to/file.xlsx");
  process.exit(1);
}

if (!fs.existsSync(JSON_PATH)) {
  console.error("recalls.json not found:", JSON_PATH);
  process.exit(1);
}

// ─── Load data ────────────────────────────────────────────────────────────────

log(`Loading Excel: ${XLSX_PATH}`);
const workbook = xlsx.readFile(XLSX_PATH, { cellDates: true });
const sheet    = workbook.Sheets[workbook.SheetNames[0]];
const rows     = xlsx.utils.sheet_to_json(sheet, { defval: "" });

log(`Excel rows: ${rows.length}`);

const recalls = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
log(`recalls.json records: ${recalls.length}`);

// ─── Build lookup: (isoDate + normProduct) → record index ────────────────────
//
// Key: "YYYY-MM-DD|normalized product" — product from facts.product or productDescription.

const lookup = new Map();

recalls.forEach((r, i) => {
  const date    = getJsonMatchDate(r);
  const product = norm(getJsonProductDescription(r));
  if (date && product) {
    lookup.set(`${date}|${product}`, i);
  }
});

log(`Lookup entries built: ${lookup.size}`);

// ─── Match Excel rows against lookup ─────────────────────────────────────────

const changes  = [];
let   scanned  = 0;

for (const row of rows) {
  // Excel columns: Date, Brand-Names, Product-Description,
  //                Product-Types, Recall-Reason-Description,
  //                Company-Name, Terminated Recall
  const excelDate    = toIsoDate(row["Date"]);
  const excelProduct = norm(row["Product-Description"] || "");
  const excelBrand   = String(row["Brand-Names"] || "").trim();

  scanned++;

  if (!excelDate || !excelProduct) continue;

  const key = `${excelDate}|${excelProduct}`;
  const idx = lookup.get(key);

  if (idx === undefined) continue; // not in our dataset

  const record = recalls[idx];

  if (record.terminated === true) continue; // already marked, skip

  // Lookup key = datePublished + normalized facts.product (or productDescription) — same as Excel Date + Product-Description.
  const jsonProductRaw = getJsonProductDescription(record);

  changes.push({
    idx,
    id:          record.id || record.slug,
    sortOrder:   typeof record.sortOrder === "number" ? record.sortOrder : null,
    product:     jsonProductRaw,
    excelBrand,
    excelDate,
  });
}

// ─── Report ───────────────────────────────────────────────────────────────────

log(`\nExcel rows scanned: ${scanned}`);
log(`Matches found: ${changes.length}`);

if (changes.length === 0) {
  log("No records to update — nothing terminated in our dataset.");
  process.exit(0);
}

changes.forEach((c) => {
  const sortStr =
    c.sortOrder != null ? String(c.sortOrder) : "(no sortOrder in JSON)";
  log(`  [ongoing → TERMINATED]`);
  log(`    sortOrder: ${sortStr}`);
  log(`    id:        ${c.id}`);
  log(`    product:   ${c.product}`);
  log(`    date:      ${c.excelDate}  brand: ${c.excelBrand}`);
});

if (DRY_RUN) {
  log("\n--dry-run: no changes saved.");
  process.exit(0);
}

// ─── Apply updates to recalls.json ───────────────────────────────────────────

const checkedAt = new Date().toISOString();

for (const c of changes) {
  recalls[c.idx].terminated      = true;
  recalls[c.idx].terminatedCheckedAt = checkedAt;
}

fs.writeFileSync(JSON_PATH, JSON.stringify(recalls, null, 2), "utf8");
log(`\nSaved ${changes.length} update(s) to recalls.json`);

// ─── Optionally sync to MongoDB ───────────────────────────────────────────────

if (WITH_MONGO) {
  (async () => {
    log("Syncing to MongoDB...");
    const { getDb, close } = require("../database/mongodb");
    const db   = await getDb();
    const coll = db.collection("recalls");

    for (const c of changes) {
      const slug = recalls[c.idx].id || recalls[c.idx].slug;
      await coll.updateOne(
        { slug },
        { $set: { terminated: true, terminatedCheckedAt: checkedAt } }
      );
      log(`  MongoDB updated: ${slug}`);
    }

    await close();
    log("MongoDB sync done.");
    log("Done.");
  })();
} else {
  log("Done.");
}
