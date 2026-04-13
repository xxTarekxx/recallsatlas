/**
 * Sync recalls from backend/scripts/recalls.json to MongoDB (recallsatlas.recalls).
 *
 * Behaviour:
 * - Keyed by slug (article.id or article.slug, trimmed). No duplicates.
 * - If canonicalUrl is missing/blank, sets https://SITE_BASE_URL/recalls/{slug} (env SITE_BASE_URL).
 * - "slug" is synced like other SYNC_KEYS so JSON ↔ Mongo stay aligned.
 * - Hash check: skips unchanged recalls (fast re-runs).
 * - Uses $set only — never replaces the whole document.
 *   Other scripts can still add fields not listed in SYNC_KEYS; those are preserved
 *   unless the same key is updated from JSON.
 * - Stores every field with its real name — no remapping.
 *
 * Run from backend/:
 *   node scripts/sync/recallsToMongo.js
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const SCRIPTS_ROOT = path.join(__dirname, "..");
const BACKEND_ROOT = path.join(SCRIPTS_ROOT, "..");

require("dotenv").config({
  path: fs.existsSync(path.join(SCRIPTS_ROOT, ".env"))
    ? path.join(SCRIPTS_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});
const { getDb, close, DB_NAME, COLLECTION_RECALLS } = require("../../database/mongodb");

const JSON_PATH = path.join(SCRIPTS_ROOT, "recalls.json");

/** Match scrapeRecalls.js / site — used only when JSON omits canonicalUrl. */
const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://recallsatlas.com").replace(
  /\/$/,
  ""
);

function defaultCanonicalUrl(slug) {
  return `${SITE_BASE_URL}/recalls/${slug}`;
}

/**
 * All fields we sync from recalls.json → MongoDB.
 * Order is stable so the hash is deterministic.
 * NOTE: "languages" is synced from recalls.json (recallTranslate.js writes there).
 *       "terminated" / "terminatedCheckedAt" are here so checkTerminated.js wins
 *       on next run (it also uses $set so no conflict).
 */
const SYNC_KEYS = [
  // Core identity
  "slug",
  "title", "headline", "description", "keywords", "canonicalUrl", "sortOrder",
  // Product / company
  "productDescription", "brandName", "brandNames", "companyName",
  "productType", "regulatedProducts", "reason",
  // Dates
  "report_date", "datePublished", "dateModified",
  "fdaPublishDate", "fdaPublishDateTime",
  "companyAnnouncementDate", "companyAnnouncementDateTime",
  "contentCurrentAsOf", "contentCurrentAsOfDateTime",
  // Images
  "image", "images", "rawImageSources",
  // Recall details
  "content", "languages", "pageTypeLabel", "disclaimer", "label",
  "classification", "distribution",
  // URLs / contacts
  "source_url", "sourceUrl", "consumerWebsite", "companyWebsite", "contacts",
  // Status
  "terminated", "terminatedCheckedAt",
  // Meta
  "scrapedAt",
];

function getMongoConnectionInfo(uri) {
  if (!uri || typeof uri !== "string") return `${DB_NAME}.${COLLECTION_RECALLS}`;
  const m = uri.match(/@([^/]+)/);
  const host = m ? m[1] : "localhost";
  return `${DB_NAME}.${COLLECTION_RECALLS} @ ${host}`;
}

/** Stable hash over all SYNC_KEYS for change detection. */
function contentHash(doc) {
  const payload = SYNC_KEYS.map((k) => JSON.stringify(doc[k] ?? null)).join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Convert YYYYMMDD or ISO date string → YYYYMMDD (report_date format). */
function dateToReportDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}${m[2]}${m[3]}` : "";
}

/**
 * Map one article from recalls.json to a MongoDB document.
 * Field names match the JSON exactly — no renaming.
 */
function articleToMongoDoc(article) {
  const slug = String(article.id ?? article.slug ?? "").trim();
  if (!slug) return null;

  const canonIn = article.canonicalUrl != null ? String(article.canonicalUrl).trim() : "";
  const canonicalUrl = canonIn || defaultCanonicalUrl(slug);

  const singleImage =
    article.image && typeof article.image === "object"
      ? article.image.url
      : article.image;
  const imagesArray = Array.isArray(article.images) ? article.images : [];
  const imageUrls =
    imagesArray.length > 0 ? imagesArray : singleImage ? [singleImage] : [];

  return {
    slug,

    // Core identity
    title: article.title || article.headline || "",
    headline: article.headline || article.title || "",
    description: article.description || "",
    keywords: article.keywords || [],
    canonicalUrl,
    sortOrder: article.sortOrder ?? null,

    // Product / company — stored with real field names
    productDescription: article.productDescription || "",
    brandName: article.brandName || "",
    brandNames: article.brandNames || [],
    companyName: article.companyName || "",
    productType: article.productType || "",
    regulatedProducts: article.regulatedProducts || [],
    reason: article.reason || "",

    // Dates
    report_date: dateToReportDate(article.datePublished || article.fdaPublishDate) || "",
    datePublished: article.datePublished || "",
    dateModified: article.dateModified || "",
    fdaPublishDate: article.fdaPublishDate || "",
    fdaPublishDateTime: article.fdaPublishDateTime || "",
    companyAnnouncementDate: article.companyAnnouncementDate || "",
    companyAnnouncementDateTime: article.companyAnnouncementDateTime || "",
    contentCurrentAsOf: article.contentCurrentAsOf || "",
    contentCurrentAsOfDateTime: article.contentCurrentAsOfDateTime || "",

    // Images
    image: singleImage || imageUrls[0] || "",
    images: imageUrls,
    rawImageSources: article.rawImageSources || [],

    // Recall content
    content: article.content || [],
    languages:
      article.languages && typeof article.languages === "object"
        ? article.languages
        : {},
    pageTypeLabel: article.pageTypeLabel || "",
    disclaimer: article.disclaimer || "",
    label: article.label || "",
    classification: article.classification || "",
    distribution: article.distribution || "",

    // URLs / contacts
    source_url: article.sourceUrl || "",
    sourceUrl: article.sourceUrl || "",
    consumerWebsite: article.consumerWebsite || "",
    companyWebsite: article.companyWebsite || "",
    contacts: article.contacts || null,

    // Status (terminated comes from checkTerminated.js — default false for new inserts)
    terminated: article.terminated === true,
    terminatedCheckedAt: article.terminatedCheckedAt || "",

    // Meta
    scrapedAt: article.scrapedAt || "",
  };
}

async function run() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("recalls.json not found at:", JSON_PATH);
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
  console.log("Target :", DB_NAME + "." + COLLECTION_RECALLS);
  console.log("MongoDB:", getMongoConnectionInfo(process.env.MONGODB_URI));

  // Build local doc list
  const localDocs = [];
  for (const article of articles) {
    const doc = articleToMongoDoc(article);
    if (doc) localDocs.push(doc);
  }

  console.log("\nLocal  (recalls.json):", localDocs.length, "recall(s)");
  localDocs.forEach((d, i) =>
    console.log(`  ${i + 1}. ${d.slug}  [sortOrder: ${d.sortOrder ?? "—"}]`)
  );

  const mongoCount = await coll.countDocuments();
  console.log("MongoDB (collection) :", mongoCount, "recall(s)\n");

  const existingDocs = await coll.find({}, {
    projection: Object.fromEntries(
      ["_contentHash", ...SYNC_KEYS].map((key) => [key, 1])
    ),
  }).toArray();
  const existingBySlug = new Map(existingDocs.map((doc) => [doc.slug, doc]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of localDocs) {
    const existing = existingBySlug.get(doc.slug);
    const localHash = contentHash(doc);

    // ── New recall ────────────────────────────────────────────────────────────
    if (!existing) {
      await coll.insertOne({ ...doc, _contentHash: localHash });
      inserted++;
      console.log("Inserted :", doc.slug);
      continue;
    }

    // ── No changes ───────────────────────────────────────────────────────────
    if (existing._contentHash === localHash) {
      skipped++;
      continue;
    }

    // ── Partial update — only changed fields, never wipes languages.* etc. ──
    const updateFields = {};
    for (const k of SYNC_KEYS) {
      if (!deepEqual(doc[k], existing[k])) {
        updateFields[k] = doc[k];
      }
    }
    updateFields._contentHash = localHash;

    await coll.updateOne({ slug: doc.slug }, { $set: updateFields });
    updated++;

    const changedKeys = Object.keys(updateFields)
      .filter((k) => k !== "_contentHash")
      .join(", ");
    console.log("Updated  :", doc.slug, "→", changedKeys || "(hash only)");
  }

  if (inserted > 0 || updated > 0) {
    const total = await coll.countDocuments();
    console.log("\nVerify:", total, "document(s) in", DB_NAME + "." + COLLECTION_RECALLS);
  }

  await close();
  console.log(
    `\nDone.  Inserted: ${inserted}  Updated: ${updated}  Unchanged: ${skipped}`
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
