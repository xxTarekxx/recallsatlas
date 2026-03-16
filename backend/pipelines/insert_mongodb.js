/**
 * STEP 4 – INSERT CLEANED FDA RECALLS INTO MONGODB
 *
 * Reads `backend/data/fda_clean_recalls.json` and inserts each recall
 * into the `recallsatlas.recalls` collection, skipping any document
 * where the `slug` already exists.
 *
 * Example usage:
 *   node insert_mongodb.js
 */

const fs = require("fs");
const path = require("path");
const {
  getRecallsCollection,
  close,
} = require("../database/mongodb");

const CLEAN_FILE = path.join(__dirname, "..", "data", "fda_clean_recalls.json");

async function insertRecallsFromFile() {
  console.log("Starting MongoDB insert pipeline...");

  if (!fs.existsSync(CLEAN_FILE)) {
    console.error(`Clean recalls file not found: ${CLEAN_FILE}`);
    return;
  }

  let recalls;
  try {
    recalls = JSON.parse(fs.readFileSync(CLEAN_FILE, "utf8"));
  } catch (err) {
    console.error("Failed to read/parse clean recalls file:", err.message || err);
    return;
  }

  if (!Array.isArray(recalls)) {
    console.error("Clean recalls file does not contain an array.");
    return;
  }

  let collection;
  try {
    collection = await getRecallsCollection();
  } catch (err) {
    console.error("Failed to get MongoDB collection:", err.message || err);
    return;
  }

  let insertedCount = 0;
  let skippedCount = 0;

  for (const recall of recalls) {
    try {
      const doc = buildMongoDocument(recall);
      if (!doc) {
        skippedCount += 1;
        continue;
      }

      const existing = await collection.findOne({ slug: doc.slug });
      if (existing) {
        skippedCount += 1;
        continue;
      }

      await collection.insertOne(doc);
      insertedCount += 1;
    } catch (err) {
      console.error(
        `Error inserting recall with slug=${recall && recall.slug
          ? recall.slug
          : "unknown"
        }:`,
        err.message || err
      );
      skippedCount += 1;
      // Continue with other documents
    }
  }

  console.log(
    `MongoDB insert pipeline completed. Inserted=${insertedCount}, Skipped=${skippedCount}`
  );

  try {
    await close();
  } catch (err) {
    console.error("Error closing MongoDB connection:", err.message || err);
  }
}

function buildMongoDocument(cleanRecall) {
  if (!cleanRecall || typeof cleanRecall !== "object") {
    return null;
  }

  const {
    slug,
    title,
    brand,
    product,
    category,
    classification,
    reason,
    distribution,
    quantity,
    report_date,
    source_url,
  } = cleanRecall;

  if (!slug || !title || !product || !report_date) {
    // Essential fields missing; skip
    return null;
  }

  const imagePath = `/images/recalls/${slug}.webp`;

  return {
    slug,
    title,
    brand: brand || "",
    product,
    category: category || "",
    classification: classification || "",
    reason: reason || "",
    distribution: distribution || "",
    quantity: quantity || "",
    report_date,
    image: imagePath,
    source_url: source_url || "",
    languages: {
      en: true,
    },
  };
}

async function insertRecalls(recalls) {
  if (!Array.isArray(recalls)) return { inserted: 0, skipped: 0 };

  let collection;
  try {
    collection = await getRecallsCollection();
  } catch (err) {
    console.error("Failed to get MongoDB collection:", err.message || err);
    return { inserted: 0, skipped: recalls.length };
  }

  let inserted = 0;
  let skipped = 0;

  for (const recall of recalls) {
    try {
      const doc = buildMongoDocument(recall);
      if (!doc) {
        skipped += 1;
        continue;
      }

      const existing = await collection.findOne({ slug: doc.slug });
      if (existing) {
        skipped += 1;
        continue;
      }

      await collection.insertOne(doc);
      inserted += 1;
    } catch (err) {
      console.error(
        `Error inserting recall with slug=${recall && recall.slug
          ? recall.slug
          : "unknown"
        }:`,
        err.message || err
      );
      skipped += 1;
    }
  }

  return { inserted, skipped };
}

if (require.main === module) {
  insertRecallsFromFile()
    .catch((err) => {
      console.error("Fatal error in insertRecalls pipeline:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await close();
      } catch {
        // ignore
      }
    });
}

module.exports = { insertRecalls, insertRecallsFromFile, buildMongoDocument };
