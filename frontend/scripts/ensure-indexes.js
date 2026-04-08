/**
 * ensure-indexes.js
 *
 * Creates all indexes needed for fast /recalls and /general-recalls page loads.
 * Safe to re-run — MongoDB skips indexes that already exist.
 *
 * Usage (pick whichever matches your setup):
 *
 *   # If MONGODB_URI is already in your environment (PM2 / systemd / shell export):
 *   node scripts/ensure-indexes.js
 *
 *   # If you use a .env.local file and Node >= 20:
 *   node --env-file=.env.local scripts/ensure-indexes.js
 *
 *   # Or pass it inline:
 *   MONGODB_URI="mongodb+srv://..." node scripts/ensure-indexes.js
 */

const path = require("path");
const fs = require("fs");

// Minimal .env parser — no dotenv dependency needed.
// Reads KEY=VALUE lines, skipping comments and blanks.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, ""); // strip surrounding quotes
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// Try .env.local first, then .env (only fills keys not already set in the environment)
const root = path.join(__dirname, "..");
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error("ERROR: MONGODB_URI is not set.");
  process.exit(1);
}

const DB_NAME = "recallsatlas";

async function main() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB:", uri.replace(/\/\/[^@]+@/, "//***@"));
    const db = client.db(DB_NAME);

    // -------------------------------------------------------------------------
    // recalls collection (FDA recalls)
    // -------------------------------------------------------------------------
    const recalls = db.collection("recalls");

    console.log("\n--- recalls collection ---");

    // Primary sort index: /api/recalls sorts by report_date DESC on every request.
    // This is the most critical index — without it every query does a full collection scan + sort.
    await recalls.createIndex({ report_date: -1 }, { background: true, name: "report_date_desc" });
    console.log("  ✓ report_date DESC");

    // Category filter: productType regex queries benefit from a field index
    // (MongoDB can skip docs where productType doesn't start with the pattern).
    await recalls.createIndex({ productType: 1 }, { background: true, name: "productType_asc" });
    console.log("  ✓ productType ASC");

    // Compound for category-filtered browsing: skip docs by productType then sort by date.
    await recalls.createIndex(
      { productType: 1, report_date: -1 },
      { background: true, name: "productType_report_date" }
    );
    console.log("  ✓ productType + report_date (compound)");

    // Slug index: used by sitemap distinct(), detail page lookups, and search suggest.
    await recalls.createIndex(
      { slug: 1 },
      { background: true, sparse: true, name: "slug_asc" }
    );
    console.log("  ✓ slug ASC (sparse)");

    // Text index for the free-text search (?q=...) — dramatically faster than $regex on every field.
    // Weights let headline / title rank higher than productDescription.
    // NOTE: a collection can only have one text index; drop the old one first if it exists.
    try {
      await recalls.createIndex(
        {
          headline: "text",
          title: "text",
          productType: "text",
          productDescription: "text",
        },
        {
          background: true,
          name: "recalls_text_search",
          weights: {
            headline: 10,
            title: 8,
            productType: 4,
            productDescription: 2,
          },
          default_language: "english",
        }
      );
      console.log("  ✓ text index (headline, title, productType, productDescription)");
    } catch (textErr) {
      // A text index already exists — that's fine.
      if (String(textErr).includes("text index already exists")) {
        console.log("  ~ text index already exists (skipped)");
      } else {
        console.warn("  ! text index warning:", textErr.message);
      }
    }

    // -------------------------------------------------------------------------
    // general collection (CPSC / general recalls)
    // -------------------------------------------------------------------------
    // Documents in this collection have a nested `recalls[]` array.
    // Field-level indexes on embedded array elements are less effective,
    // but categorySlug helps when querying by category.
    const general = db.collection("general");

    console.log("\n--- general collection ---");

    await general.createIndex(
      { categorySlug: 1 },
      { background: true, sparse: true, name: "categorySlug_asc" }
    );
    console.log("  ✓ categorySlug ASC (sparse)");

    // -------------------------------------------------------------------------
    // cars collection (vehicle recalls)
    // -------------------------------------------------------------------------
    const cars = db.collection("cars");

    console.log("\n--- cars collection ---");

    await cars.createIndex(
      { campaignNumber: 1 },
      { background: true, sparse: true, name: "campaignNumber_asc" }
    );
    console.log("  ✓ campaignNumber ASC (sparse)");

    await cars.createIndex(
      { slug: 1 },
      { background: true, sparse: true, name: "slug_asc" }
    );
    console.log("  ✓ slug ASC (sparse)");

    console.log("\nAll indexes ensured successfully.\n");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("ensure-indexes failed:", err);
  process.exit(1);
});
