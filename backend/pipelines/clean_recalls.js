/**
 * STEP 2 – CLEAN AND NORMALIZE FDA RECALL DATA
 *
 * Reads `backend/data/fda_raw_recalls.json`, filters and normalizes
 * records, generates SEO slugs and titles, and writes
 * `backend/data/fda_clean_recalls.json`.
 *
 * Example usage:
 *   node clean_recalls.js
 */

const fs = require("fs");
const path = require("path");

const INPUT_FILE = path.join(__dirname, "..", "data", "fda_raw_recalls.json");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "fda_clean_recalls.json");

/**
 * Normalize a string for slug usage.
 */
function toSlugPart(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeString(val) {
  return typeof val === "string" ? val.trim() : "";
}

/**
 * Build a normalized recall object from a raw FDA recall entry.
 * Returns null when essential fields are missing or invalid.
 */
function normalizeRecall(raw, usedSlugs) {
  try {
    const reportDate = safeString(raw.report_date);
    if (!reportDate || !/^\d{8}$/.test(reportDate)) {
      return null;
    }

    // Filter by year >= 2021 (YYYYMMDD)
    if (reportDate < "20210101") {
      return null;
    }

    const brand = safeString(raw.brand_name || raw.recalling_firm);
    const product = safeString(raw.product_description || raw.product);
    if (!product) {
      return null;
    }

    // Derive category from product_type or default to "Drugs"
    const category = safeString(raw.product_type) || "Drugs";

    const classification = safeString(raw.classification);
    const reason = safeString(raw.reason_for_recall || raw.reason);
    const distribution = safeString(
      raw.distribution_pattern || raw.distribution
    );
    const quantity = safeString(
      raw.product_quantity || raw.quantity
    );

    const year = reportDate.slice(0, 4);

    const brandSlugPart = toSlugPart(brand || "unknown");
    const productSlugPart = toSlugPart(product || "product");
    let baseSlug = `${brandSlugPart}-${productSlugPart}-recall-${year}`;
    baseSlug = baseSlug.replace(/^-+|-+$/g, "") || `recall-${year}`;

    // Ensure slug uniqueness within this dataset
    let slug = baseSlug;
    let counter = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    usedSlugs.add(slug);

    const titleProduct =
      product.charAt(0).toUpperCase() + product.slice(1).toLowerCase();
    const title = `${titleProduct} Recall (${year}) – FDA Safety Alert`;

    // FDA source URL – if there is a provided URL use it, otherwise construct a generic one
    const sourceUrl =
      safeString(raw.url) ||
      `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`;

    return {
      slug,
      title,
      brand,
      product,
      category,
      classification,
      reason,
      distribution,
      quantity,
      report_date: reportDate,
      source_url: sourceUrl,
    };
  } catch (err) {
    console.error("Error normalizing recall:", err.message || err);
    return null;
  }
}

async function cleanRecallsFromFile() {
  console.log("Starting recall clean/normalize pipeline...");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    return;
  }

  let rawJson;
  try {
    rawJson = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  } catch (err) {
    console.error("Failed to read/parse raw recalls file:", err.message || err);
    return;
  }

  const rawResults = Array.isArray(rawJson.results) ? rawJson.results : [];
  console.log(`Loaded ${rawResults.length} raw recalls from FDA file.`);

  const usedRecallNumbers = new Set();
  const usedSlugs = new Set();
  const clean = [];

  for (const raw of rawResults) {
    try {
      const recallNumber = safeString(raw.recall_number);
      if (recallNumber) {
        if (usedRecallNumbers.has(recallNumber)) {
          // Duplicate recall_number; skip
          continue;
        }
        usedRecallNumbers.add(recallNumber);
      }

      const normalized = normalizeRecall(raw, usedSlugs);
      if (!normalized) {
        continue;
      }

      clean.push(normalized);
    } catch (err) {
      console.error("Error processing recall entry:", err.message || err);
      // Skip broken entries, continue
    }
  }

  try {
    fs.writeFileSync(JSON.stringify);
  } catch {}

  try {
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(clean, null, 2),
      "utf8"
    );
    console.log(
      `Saved ${clean.length} cleaned recalls to ${OUTPUT_FILE}`
    );
  } catch (err) {
    console.error("Failed to write cleaned recalls file:", err.message || err);
  }
}

// Keep function usable from other modules (e.g., tests or combined pipelines).
async function cleanRecalls(rawRecalls) {
  const usedSlugs = new Set();
  const usedRecallNumbers = new Set();
  const result = [];
  for (const raw of rawRecalls || []) {
    const recallNumber =
      typeof raw === "object" && raw
        ? safeString(raw.recall_number)
        : "";
    if (recallNumber) {
      if (usedRecallNumbers.has(recallNumber)) {
        continue;
      }
      usedRecallNumbers.add(recallNumber);
    }
    const normalized = normalizeRecall(raw, usedSlugs);
    if (normalized) {
      result.push(normalized);
    }
  }
  return result;
}

if (require.main === module) {
  cleanRecallsFromFile().catch((err) => {
    console.error("Fatal error in cleanRecalls pipeline:", err);
    process.exitCode = 1;
  });
}

module.exports = { cleanRecalls, cleanRecallsFromFile };
