/**
 * fixSortOrder.js
 *
 * One-time (and safe-to-rerun) script that renumbers sortOrder in recalls.json
 * so that:
 *   - sortOrder 1   = oldest recall (earliest datePublished)
 *   - sortOrder N   = newest recall (latest datePublished)
 *
 * Image folder names on disk are NOT renamed — they already exist and are valid.
 * Only the paths stored inside the JSON (image.url and images[]) are updated to
 * match the new sortOrder so they stay in sync with future scraper runs.
 *
 * NOTE: Because old folders keep their original names (e.g. "1000-slug/") and
 * new records scraped after this fix will use the new ascending numbers (e.g.
 * "240-slug/"), there will be a cosmetic inconsistency in folder naming on disk.
 * That is intentional and harmless — Next.js serves images by URL path, not by
 * folder sort prefix.
 *
 * Run from backend/:
 *   node scripts/fixSortOrder.js
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const JSON_PATH = path.join(DATA_DIR, "recalls.json");

// ─── Load ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(JSON_PATH)) {
  console.error("recalls.json not found at:", JSON_PATH);
  process.exit(1);
}

const raw = fs.readFileSync(JSON_PATH, "utf8");
let records;
try {
  records = JSON.parse(raw);
} catch (e) {
  console.error("Failed to parse recalls.json:", e.message);
  process.exit(1);
}

if (!Array.isArray(records) || records.length === 0) {
  console.error("recalls.json is empty or not an array.");
  process.exit(1);
}

console.log(`Loaded ${records.length} records.`);

// ─── Sort by datePublished ascending (oldest first = lowest sortOrder) ───────

function getDate(r) {
  // datePublished is ISO string e.g. "2025-04-11T00:00:00.000Z"
  // fdaPublishDate is also ISO. Fall back to empty string if missing.
  return r.datePublished || r.fdaPublishDate || "";
}

const sorted = [...records].sort((a, b) => {
  const da = getDate(a);
  const db = getDate(b);
  if (da < db) return -1;
  if (da > db) return 1;
  // Tie-break: preserve original sortOrder (higher original = more recent)
  return (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
});

// ─── Reassign sortOrders only (image paths are NOT touched) ──────────────────
//
// Image folder names on disk are "${sortOrder}-${slug}".
// After running this script, run renameImageFolders.js once to rename the
// actual folders to match the new sortOrder values.

let changed = 0;

sorted.forEach((record, index) => {
  const newSortOrder = index + 1; // 1-based, oldest = 1

  if (record.sortOrder === newSortOrder) return; // nothing to do

  record.sortOrder = newSortOrder;
  changed++;
});

console.log(`Updated sortOrder on ${changed} records.`);
console.log(`Range: 1 (oldest) → ${sorted.length} (newest)`);

// ─── Spot-check ──────────────────────────────────────────────────────────────

console.log("\nOldest 3:");
sorted.slice(0, 3).forEach((r) =>
  console.log(`  sortOrder=${r.sortOrder}  date=${getDate(r).slice(0, 10)}  id=${r.id}`)
);
console.log("Newest 3:");
sorted.slice(-3).forEach((r) =>
  console.log(`  sortOrder=${r.sortOrder}  date=${getDate(r).slice(0, 10)}  id=${r.id}`)
);

// ─── Write back (newest first = highest sortOrder at index 0) ────────────────

const descending = [...sorted].reverse();
fs.writeFileSync(JSON_PATH, JSON.stringify(descending, null, 2), "utf8");
console.log(`\nWrote updated recalls.json (${descending.length} records, newest first).`);
