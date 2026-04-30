/**
 * Replace the entire recalls collection with the English-only EEAT content.
 *
 * WARNING: This DELETES all existing documents in recallsatlas.recalls
 * and replaces them with the records from the EEAT JSON file.
 *
 * Run from backend/:
 *   node fdaRecalls/scripts/sync/replaceRecallsWithEeat.js
 *   node fdaRecalls/scripts/sync/replaceRecallsWithEeat.js --input=./fdaRecalls/data/fromRecallsFile-english-only-EEAT-DONE.json
 *   node fdaRecalls/scripts/sync/replaceRecallsWithEeat.js --dry-run
 */

"use strict";

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

const { getDb, close, DB_NAME, COLLECTION_RECALLS } = require("../../../database/mongodb");

const args = process.argv.slice(2);
const INPUT_ARG = args.find((a) => a.startsWith("--input="));
const DRY_RUN = args.includes("--dry-run");

const JSON_PATH = INPUT_ARG
  ? path.resolve(BACKEND_ROOT, INPUT_ARG.slice("--input=".length))
  : path.join(DATA_ROOT, "fromRecallsFile-english-only-EEAT-DONE.json");

const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://recallsatlas.com").replace(/\/$/, "");

function defaultCanonicalUrl(slug) {
  return `${SITE_BASE_URL}/recalls/${slug}`;
}

function contentHash(doc) {
  return crypto.createHash("sha256").update(JSON.stringify(doc)).digest("hex");
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
    console.error("Input file not found:", JSON_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const articles = JSON.parse(raw);
  if (!Array.isArray(articles)) {
    console.error("Input must be a JSON array.");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("REPLACE recalls collection with English EEAT content");
  console.log("=".repeat(60));
  console.log("Input :", path.basename(JSON_PATH));
  console.log("Target:", `${DB_NAME}.${COLLECTION_RECALLS}`);
  if (DRY_RUN) console.log("\n*** DRY RUN — no changes will be made ***\n");

  // Build docs
  const docs = [];
  for (const article of articles) {
    const doc = articleToMongoDoc(article);
    if (doc) {
      docs.push({ ...doc, _contentHash: contentHash(doc) });
    } else {
      console.warn("Skipped (no slug):", article.id ?? article.headline ?? "(unknown)");
    }
  }

  console.log(`\nPrepared ${docs.length} document(s) from JSON.`);

  if (DRY_RUN) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  const db = await getDb();
  const coll = db.collection(COLLECTION_RECALLS);

  // Count before
  const beforeCount = await coll.estimatedDocumentCount();
  console.log(`\nBefore: ${beforeCount} document(s) in collection.`);

  // Delete all existing
  console.log("Deleting all existing documents...");
  const deleteResult = await coll.deleteMany({});
  console.log(`Deleted: ${deleteResult.deletedCount} document(s).`);

  // Insert all new docs
  console.log(`Inserting ${docs.length} EEAT document(s)...`);
  if (docs.length > 0) {
    const insertResult = await coll.insertMany(docs, { ordered: false });
    console.log(`Inserted: ${insertResult.insertedCount} document(s).`);
  }

  // Verify
  const afterCount = await coll.estimatedDocumentCount();
  console.log(`\nAfter: ${afterCount} document(s) in collection.`);

  await close();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
