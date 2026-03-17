/**
 * Insert recalls from backend/data/recalls.json into MongoDB (recallsatlas.recalls).
 * Maps Article schema to the flat schema the frontend expects (slug, product, brand, report_date, image, reason, source_url).
 *
 * Run from backend (with .env containing MONGODB_URI):
 *   node scripts/insert_recalls_from_json.js
 */
const path = require("path");
const fs = require("fs");
const { getRecallsCollection, close } = require("../database/mongodb");

const JSON_PATH = path.join(__dirname, "..", "data", "recalls.json");

function dateToReportDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}${m[2]}${m[3]}` : "";
}

function articleToMongoDoc(article) {
  const slug = article.id;
  if (!slug) return null;
  const image = article.image && typeof article.image === "object" ? article.image.url : article.image;
  return {
    slug,
    product: article.productDescription || article.title || "",
    brand: article.brandName || article.companyName || "",
    report_date: dateToReportDate(article.datePublished || article.fdaPublishDate) || "",
    image: image || "",
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

  const coll = await getRecallsCollection();
  let inserted = 0;
  let skipped = 0;

  for (const article of articles) {
    const doc = articleToMongoDoc(article);
    if (!doc) continue;
    const existing = await coll.findOne({ slug: doc.slug });
    if (existing) {
      skipped++;
      continue;
    }
    await coll.insertOne(doc);
    inserted++;
    console.log("Inserted:", doc.slug);
  }

  await close();
  console.log("Done. Inserted:", inserted, "Skipped (already exist):", skipped);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
