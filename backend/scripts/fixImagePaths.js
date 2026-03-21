/**
 * fixImagePaths.js
 *
 * After fixSortOrder.js re-numbers sortOrders, this script repairs all image
 * URLs stored in recalls.json so they match the new sortOrder-based folder names.
 *
 * Pattern: /images/recalls/<anyNumber>-<slug>/hash.webp
 *          → /images/recalls/<correctSortOrder>-<slug>/hash.webp
 *
 * Run from backend/:
 *   node scripts/fixImagePaths.js
 *
 * Then run renameImageFolders.js on your local machine to rename the actual
 * folders on disk to match.
 */

const fs = require("fs");
const path = require("path");

const JSON_PATH = path.resolve(__dirname, "..", "data", "recalls.json");

if (!fs.existsSync(JSON_PATH)) {
  console.error("recalls.json not found:", JSON_PATH);
  process.exit(1);
}

const records = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

// Build slug → sortOrder map
const slugToSort = {};
records.forEach((r) => {
  if (r.id && typeof r.sortOrder === "number") {
    slugToSort[r.id] = r.sortOrder;
  }
});

function fixUrl(url, correctSortOrder) {
  if (!url || typeof url !== "string") return url;
  // Replace the numeric prefix in the folder name
  return url.replace(
    /^(\/images\/recalls\/)\d+(-)/,
    `$1${correctSortOrder}$2`
  );
}

let fixedRecords = 0;
let fixedUrls = 0;

records.forEach((r) => {
  const sort = slugToSort[r.id];
  if (sort === undefined) return;

  let recordFixed = false;

  // Fix primary image object
  if (r.image && typeof r.image === "object" && r.image.url) {
    const fixed = fixUrl(r.image.url, sort);
    if (fixed !== r.image.url) { r.image.url = fixed; fixedUrls++; recordFixed = true; }
  } else if (typeof r.image === "string") {
    const fixed = fixUrl(r.image, sort);
    if (fixed !== r.image) { r.image = fixed; fixedUrls++; recordFixed = true; }
  }

  // Fix images array
  if (Array.isArray(r.images)) {
    r.images = r.images.map((url) => {
      const fixed = fixUrl(url, sort);
      if (fixed !== url) { fixedUrls++; recordFixed = true; }
      return fixed;
    });
  }

  if (recordFixed) fixedRecords++;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(records, null, 2), "utf8");
console.log(`Fixed ${fixedUrls} image URLs across ${fixedRecords} records.`);
console.log("Next: run renameImageFolders.js on your local machine to rename the actual folders.");
