"use strict";

/**
 * Sync general recalls from local JSON to MongoDB (recallsatlas.generalRecalls).
 *
 * Keyed by slug. Hash-checked — skips unchanged records.
 * Uses $set only, never replaces whole documents.
 *
 * Run from backend/:
 *   node generalRecalls/scripts/sync/generalRecallsToMongo.js
 *   node generalRecalls/scripts/sync/generalRecallsToMongo.js --input=./generalRecalls/data/some-other-file.json
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

const { getDb, close, DB_NAME } = require("../../../database/mongodb");

const COLLECTION = "generalRecalls";

const INPUT_ARG = process.argv.slice(2).find((a) => a.startsWith("--input="));
const JSON_PATH = INPUT_ARG
  ? path.resolve(BACKEND_ROOT, INPUT_ARG.slice("--input=".length))
  : path.join(DATA_ROOT, "generalrecalls-10-lang-clean-eeat.pruned.json");

function contentHash(doc) {
  return crypto.createHash("sha256").update(JSON.stringify(doc)).digest("hex");
}

async function run() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("Input file not found:", JSON_PATH);
    process.exit(1);
  }

  const records = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  if (!Array.isArray(records)) {
    console.error("Input must be a JSON array.");
    process.exit(1);
  }

  const db = await getDb();
  const coll = db.collection(COLLECTION);

  console.log("Target  :", `${DB_NAME}.${COLLECTION}`);
  console.log("Input   :", path.basename(JSON_PATH));
  console.log("Records :", records.length);

  // Load existing slugs + hashes
  const existing = await coll
    .find({}, { projection: { _id: 0, slug: 1, _contentHash: 1 } })
    .toArray();
  const existingBySlug = new Map(existing.map((d) => [d.slug, d._contentHash || ""]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records) {
    const slug = record.slug;
    if (!slug) {
      console.warn("Skipping record with no slug:", record.RecallNumber || record.RecallID);
      continue;
    }

    const hash = contentHash(record);
    const existingHash = existingBySlug.get(slug);

    try {
      if (!existingHash) {
        await coll.insertOne({ ...record, _contentHash: hash });
        inserted++;
        console.log("Inserted:", slug);
      } else if (existingHash !== hash) {
        await coll.updateOne({ slug }, { $set: { ...record, _contentHash: hash } });
        updated++;
        console.log("Updated :", slug);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error("Error on", slug, "—", err.message);
      errors++;
    }
  }

  const total = await coll.estimatedDocumentCount();
  await close();

  console.log(`\nDone.`);
  console.log(`  Inserted : ${inserted}`);
  console.log(`  Updated  : ${updated}`);
  console.log(`  Unchanged: ${skipped}`);
  console.log(`  Errors   : ${errors}`);
  console.log(`  Total in collection: ${total}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
