/**
 * Sync recalls from a local recalls JSON file to MongoDB (recallsatlas.recalls).
 *
 * Behaviour:
 * - Keyed by slug (article.id or article.slug, trimmed). No duplicates.
 * - If canonicalUrl is missing/blank, sets https://SITE_BASE_URL/recalls/{slug} (env SITE_BASE_URL).
 * - Hash check: skips unchanged recalls quickly.
 * - Uses $set only and never replaces whole documents.
 * - Preserves fields outside the sync set.
 *
 * Run from backend/:
 *   node scripts/sync/recallsToMongo.js
 *   node scripts/sync/recallsToMongo.js --input=./fdaRecalls/data/recalls-cleaned-translated.json
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const PIPELINE_ROOT = path.join(__dirname, "..", "..");
const DATA_ROOT = path.join(PIPELINE_ROOT, "data");
const BACKEND_ROOT = path.join(PIPELINE_ROOT, "..");
const ENV_ROOT = path.join(BACKEND_ROOT, "scripts");

require("dotenv").config({
  path: fs.existsSync(path.join(ENV_ROOT, ".env"))
    ? path.join(ENV_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});

const {
  getDb,
  close,
  DB_NAME,
  COLLECTION_RECALLS,
} = require("../../../database/mongodb");

const INPUT_ARG = process.argv.slice(2).find((arg) => arg.startsWith("--input="));
const JSON_PATH = INPUT_ARG
  ? path.resolve(BACKEND_ROOT, INPUT_ARG.slice("--input=".length))
  : path.join(DATA_ROOT, "recalls-cleaned-translated.json");
const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://recallsatlas.com").replace(
  /\/$/,
  ""
);

const SYNC_KEYS = [
  "slug",
  "title",
  "headline",
  "description",
  "keywords",
  "canonicalUrl",
  "sortOrder",
  "productDescription",
  "brandName",
  "brandNames",
  "companyName",
  "productType",
  "regulatedProducts",
  "reason",
  "report_date",
  "datePublished",
  "dateModified",
  "fdaPublishDate",
  "fdaPublishDateTime",
  "companyAnnouncementDate",
  "companyAnnouncementDateTime",
  "contentCurrentAsOf",
  "contentCurrentAsOfDateTime",
  "image",
  "images",
  "rawImageSources",
  "content",
  "languages",
  "pageTypeLabel",
  "disclaimer",
  "label",
  "classification",
  "distribution",
  "source_url",
  "sourceUrl",
  "consumerWebsite",
  "companyWebsite",
  "contacts",
  "terminated",
  "terminatedCheckedAt",
  "scrapedAt",
];

function getMongoConnectionInfo(uri) {
  if (!uri || typeof uri !== "string") return `${DB_NAME}.${COLLECTION_RECALLS}`;
  const m = uri.match(/@([^/]+)/);
  const host = m ? m[1] : "localhost";
  return `${DB_NAME}.${COLLECTION_RECALLS} @ ${host}`;
}

function defaultCanonicalUrl(slug) {
  return `${SITE_BASE_URL}/recalls/${slug}`;
}

function contentHash(doc) {
  const payload = SYNC_KEYS.map((k) => JSON.stringify(doc[k] ?? null)).join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function dateToReportDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}${m[2]}${m[3]}` : "";
}

function articleToMongoDoc(article) {
  const slug = String(article.id ?? article.slug ?? "").trim();
  if (!slug) return null;

  const canonIn = article.canonicalUrl != null ? String(article.canonicalUrl).trim() : "";
  const canonicalUrl = canonIn || defaultCanonicalUrl(slug);

  const singleImage =
    article.image && typeof article.image === "object" ? article.image.url : article.image;
  const imagesArray = Array.isArray(article.images) ? article.images : [];
  const imageUrls = imagesArray.length > 0 ? imagesArray : singleImage ? [singleImage] : [];

  return {
    slug,
    title: article.title || article.headline || "",
    headline: article.headline || article.title || "",
    description: article.description || "",
    keywords: article.keywords || [],
    canonicalUrl,
    sortOrder: article.sortOrder ?? null,
    productDescription: article.productDescription || "",
    brandName: article.brandName || "",
    brandNames: article.brandNames || [],
    companyName: article.companyName || "",
    productType: article.productType || "",
    regulatedProducts: article.regulatedProducts || [],
    reason: article.reason || "",
    report_date: dateToReportDate(article.datePublished || article.fdaPublishDate) || "",
    datePublished: article.datePublished || "",
    dateModified: article.dateModified || "",
    fdaPublishDate: article.fdaPublishDate || "",
    fdaPublishDateTime: article.fdaPublishDateTime || "",
    companyAnnouncementDate: article.companyAnnouncementDate || "",
    companyAnnouncementDateTime: article.companyAnnouncementDateTime || "",
    contentCurrentAsOf: article.contentCurrentAsOf || "",
    contentCurrentAsOfDateTime: article.contentCurrentAsOfDateTime || "",
    image: singleImage || imageUrls[0] || "",
    images: imageUrls,
    rawImageSources: article.rawImageSources || [],
    content: article.content || [],
    languages:
      article.languages && typeof article.languages === "object" ? article.languages : {},
    pageTypeLabel: article.pageTypeLabel || "",
    disclaimer: article.disclaimer || "",
    label: article.label || "",
    classification: article.classification || "",
    distribution: article.distribution || "",
    source_url: article.sourceUrl || "",
    sourceUrl: article.sourceUrl || "",
    consumerWebsite: article.consumerWebsite || "",
    companyWebsite: article.companyWebsite || "",
    contacts: article.contacts || null,
    terminated: article.terminated === true,
    terminatedCheckedAt: article.terminatedCheckedAt || "",
    scrapedAt: article.scrapedAt || "",
  };
}

async function run() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("Input recalls JSON not found at:", JSON_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const articles = JSON.parse(raw);
  if (!Array.isArray(articles)) {
    console.error("Input recalls JSON must be a JSON array.");
    process.exit(1);
  }

  const db = await getDb();
  const coll = db.collection(COLLECTION_RECALLS);

  console.log("Target :", `${DB_NAME}.${COLLECTION_RECALLS}`);
  console.log("MongoDB:", getMongoConnectionInfo(process.env.MONGODB_URI));

  const localDocs = [];
  for (const article of articles) {
    const doc = articleToMongoDoc(article);
    if (doc) localDocs.push(doc);
  }

  console.log(`\nLocal  (${path.basename(JSON_PATH)}):`, localDocs.length, "recall(s)");

  const mongoCount = await coll.estimatedDocumentCount();
  console.log("MongoDB (collection) :", mongoCount, "recall(s)\n");

  const existingDocs = await coll
    .find({}, { projection: { _id: 0, slug: 1, _contentHash: 1 } })
    .toArray();
  const existingBySlug = new Map(existingDocs.map((doc) => [doc.slug, doc._contentHash || ""]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of localDocs) {
    const localHash = contentHash(doc);
    const existingHash = existingBySlug.get(doc.slug);

    if (!existingHash) {
      await coll.insertOne({ ...doc, _contentHash: localHash });
      inserted++;
      console.log("Inserted :", doc.slug);
      continue;
    }

    if (existingHash === localHash) {
      skipped++;
      continue;
    }

    await coll.updateOne({ slug: doc.slug }, { $set: { ...doc, _contentHash: localHash } });
    updated++;
    console.log("Updated  :", doc.slug);
  }

  if (inserted > 0 || updated > 0) {
    const total = await coll.estimatedDocumentCount();
    console.log("\nVerify:", total, "document(s) in", `${DB_NAME}.${COLLECTION_RECALLS}`);
  }

  await close();
  console.log(`\nDone.  Inserted: ${inserted}  Updated: ${updated}  Unchanged: ${skipped}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
