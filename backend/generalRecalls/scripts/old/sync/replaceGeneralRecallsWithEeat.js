/**
 * Replace the entire generalRecalls collection with the English-only EEAT content.
 *
 * WARNING: This DELETES all existing documents in recallsatlas.generalRecalls
 * and replaces them with the records from the EEAT English-only validated JSON.
 *
 * Run from backend/:
 *   node generalRecalls/scripts/sync/replaceGeneralRecallsWithEeat.js
 *   node generalRecalls/scripts/sync/replaceGeneralRecallsWithEeat.js --input=./generalRecalls/data/new-generalRecalls-en-eeat.en-only.validated.json
 *   node generalRecalls/scripts/sync/replaceGeneralRecallsWithEeat.js --dry-run
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

const { getDb, close, DB_NAME } = require("../../../database/mongodb");

const COLLECTION = "generalRecalls";

const args = process.argv.slice(2);
const INPUT_ARG = args.find((a) => a.startsWith("--input="));
const DRY_RUN = args.includes("--dry-run");

const JSON_PATH = INPUT_ARG
  ? path.resolve(BACKEND_ROOT, INPUT_ARG.slice("--input=".length))
  : path.join(DATA_ROOT, "new-generalRecalls-en-eeat.en-only.validated.json");

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

  console.log("=".repeat(60));
  console.log("REPLACE generalRecalls collection with English EEAT content");
  console.log("=".repeat(60));
  console.log("Input :", path.basename(JSON_PATH));
  console.log("Target:", `${DB_NAME}.${COLLECTION}`);
  if (DRY_RUN) console.log("\n*** DRY RUN — no changes will be made ***\n");

  // Validate and prepare docs
  const docs = [];
  for (const record of records) {
    const slug = record.slug;
    if (!slug) {
      console.warn("Skipping record with no slug:", record.RecallNumber || record.RecallID || "(unknown)");
      continue;
    }
    docs.push({ ...record, _contentHash: contentHash(record) });
  }

  console.log(`\nPrepared ${docs.length} document(s) from JSON.`);

  if (DRY_RUN) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  const db = await getDb();
  const coll = db.collection(COLLECTION);

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
