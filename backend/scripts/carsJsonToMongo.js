/**
 * Upsert vehicle recall documents from database/cars/data/cars.json
 * into MongoDB recallsatlas.cars (key: campaignNumber).
 *
 * Requires MONGODB_URI (or mongodb://localhost:27017).
 *
 * Run from backend/:
 *   node scripts/carsJsonToMongo.js
 */
const path = require("path");
const fs = require("fs");

require("dotenv").config({
  path: fs.existsSync(path.join(__dirname, ".env"))
    ? path.join(__dirname, ".env")
    : path.join(__dirname, "..", ".env"),
});

const { getDb, close, DB_NAME } = require("../database/mongodb");

const JSON_PATH = path.join(
  __dirname,
  "..",
  "database",
  "cars",
  "data",
  "cars.json"
);

const COLLECTION = "cars";

async function main() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error("cars.json must be a JSON array.");
  }

  const db = await getDb();
  const coll = db.collection(COLLECTION);
  await coll.createIndex({ campaignNumber: 1 }, { unique: true, name: "campaignNumber_unique" });

  let newCount = 0;

  for (const row of list) {
    const campaignNumber = String(row?.campaignNumber ?? "").trim();
    if (!campaignNumber) {
      console.warn("Skipping row without campaignNumber.");
      continue;
    }

    const doc = { ...row, campaignNumber };
    delete doc._id;

    const now = new Date().toISOString();
    if (!doc.updatedAt) doc.updatedAt = now;
    if (!doc.createdAt) doc.createdAt = now;

    const r = await coll.updateOne(
      { campaignNumber },
      { $set: doc },
      { upsert: true }
    );
    if (r.upsertedCount) newCount += 1;
  }

  const total = await coll.countDocuments();
  console.log(
    `Done: ${DB_NAME}.${COLLECTION} ← ${JSON_PATH}\n` +
      `  processed: ${list.length}, new inserts this run: ${newCount}, total docs in collection: ${total}`
  );

  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
