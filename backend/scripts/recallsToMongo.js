/**
 * Sync recalls from backend/data/recalls.json to MongoDB (recallsatlas.recalls).
 * - Hash check: compares content hash of JSON (and images) to detect changes.
 * - No duplicates: keys by slug.
 * - Only changed fields are updated in MongoDB (no full-doc replace).
 *
 * Run from backend (with .env containing MONGODB_URI):
 *   node scripts/recallsToMongo.js
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
// Load backend/.env so MONGODB_URI is set before mongodb.js runs (same as Compass connection)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { getDb, close, DB_NAME, COLLECTION_RECALLS } = require("../database/mongodb");

const JSON_PATH = path.join(__dirname, "..", "data", "recalls.json");

/** Top-level fields we sync (order stable for hash). */
const SYNC_KEYS = [
  "product", "brand", "report_date", "image", "images", "reason",
  "classification", "distribution", "source_url", "sortOrder", "content", "title"
];

function getMongoConnectionInfo(uri) {
  if (!uri || typeof uri !== "string") return `${DB_NAME}.${COLLECTION_RECALLS}`;
  const m = uri.match(/@([^/]+)/);
  const host = m ? m[1] : "localhost";
  return `${DB_NAME}.${COLLECTION_RECALLS} @ ${host}`;
}

/** Content hash for change detection (includes images array and all sync fields). */
function contentHash(doc) {
  const payload = SYNC_KEYS.map((k) => JSON.stringify(doc[k])).join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function dateToReportDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}${m[2]}${m[3]}` : "";
}

function articleToMongoDoc(article) {
  const slug = article.id;
  if (!slug) return null;
  const singleImage = article.image && typeof article.image === "object" ? article.image.url : article.image;
  const imagesArray = Array.isArray(article.images) ? article.images : [];
  const imageUrls = imagesArray.length > 0 ? imagesArray : (singleImage ? [singleImage] : []);
  return {
    slug,
    product: article.productDescription || article.title || "",
    brand: article.brandName || article.companyName || "",
    report_date: dateToReportDate(article.datePublished || article.fdaPublishDate) || "",
    image: singleImage || (imageUrls[0] || ""),
    images: imageUrls,
    reason: article.reason || "",
    classification: article.classification || "",
    distribution: article.distribution || "",
    source_url: article.sourceUrl || "",
    sortOrder: article.sortOrder,
    content: article.content,
    title: article.title || article.headline,
  };
}

async function run() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("Not found:", JSON_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const articles = JSON.parse(raw);
  if (!Array.isArray(articles)) {
    console.error("recalls.json must be a JSON array.");
    process.exit(1);
  }

  const db = await getDb();
  const coll = db.collection(COLLECTION_RECALLS);
  console.log("Target: database =", DB_NAME, ", collection =", COLLECTION_RECALLS);
  console.log("MongoDB:", getMongoConnectionInfo(process.env.MONGODB_URI));
  console.log("(In Compass, open: " + DB_NAME + " > " + COLLECTION_RECALLS + ")");

  const localDocs = [];
  for (const article of articles) {
    const doc = articleToMongoDoc(article);
    if (doc) localDocs.push(doc);
  }
  console.log("Local (recalls.json):", localDocs.length, "recall(s)");
  localDocs.forEach((d, i) => {
    console.log("  ", i + 1, "id:", d.slug, "sortOrder:", d.sortOrder ?? "(none)");
  });

  const mongoCount = await coll.countDocuments();
  console.log("MongoDB (collection):", mongoCount, "recall(s)");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of localDocs) {
    const existing = await coll.findOne({ slug: doc.slug });
    const localHash = contentHash(doc);

    if (!existing) {
      await coll.insertOne({ ...doc, _contentHash: localHash });
      inserted++;
      console.log("Inserted:", doc.slug);
      continue;
    }

    if (existing._contentHash === localHash) {
      skipped++;
      continue;
    }

    const updateFields = {};
    for (const k of SYNC_KEYS) {
      if (!deepEqual(doc[k], existing[k])) updateFields[k] = doc[k];
    }
    if (Object.keys(updateFields).length === 0) {
      updateFields._contentHash = localHash;
    } else {
      updateFields._contentHash = localHash;
    }
    await coll.updateOne({ slug: doc.slug }, { $set: updateFields });
    updated++;
    console.log("Updated:", doc.slug, "fields:", Object.keys(updateFields).filter((k) => k !== "_contentHash").join(", ") || "(hash only)");
  }

  if (inserted > 0 || updated > 0) {
    const total = await coll.countDocuments();
    console.log("Verify:", total, "document(s) in", DB_NAME + "." + COLLECTION_RECALLS);
  }

  await close();
  console.log("Done. Inserted:", inserted, "Updated:", updated, "Unchanged:", skipped);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
