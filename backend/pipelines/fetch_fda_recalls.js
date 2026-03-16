/**
 * STEP 1 – FETCH FDA RECALL DATA
 *
 * Fetches all drug enforcement recalls from the FDA Enforcement API
 * in batches using the `skip` parameter and stores the raw combined
 * results into `backend/data/fda_raw_recalls.json`.
 *
 * Example usage:
 *   node fetch_fda_recalls.js
 */

const fs = require("fs");
const path = require("path");

const https = require("https");

const FDA_ENDPOINT = "https://api.fda.gov/drug/enforcement.json";
const BATCH_LIMIT = 1000;
const OUTPUT_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "fda_raw_recalls.json");

/**
 * Simple GET wrapper using https (to avoid extra dependencies).
 */
function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        const contentType = res.headers["content-type"] || "";

        let error;
        if (statusCode < 200 || statusCode >= 300) {
          error = new Error(`Request Failed. Status Code: ${statusCode}`);
        } else if (!/^application\/json/.test(contentType)) {
          // The FDA API sometimes omits content-type, so don't be too strict
        }
        if (error) {
          res.resume();
          reject(error);
          return;
        }

        let rawData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", (e) => {
        reject(e);
      });
  });
}

async function fetchFdaRecalls() {
  console.log("Starting FDA recalls fetch pipeline...");
  let allResults = [];
  let skip = 0;

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  while (true) {
    const url = `${FDA_ENDPOINT}?limit=${BATCH_LIMIT}&skip=${skip}`;
    console.log(`Fetching batch with skip=${skip}...`);
    try {
      const data = await httpGetJson(url);
      const results = Array.isArray(data.results) ? data.results : [];

      console.log(`  Retrieved ${results.length} recalls`);

      if (results.length === 0) {
        break;
      }

      allResults = allResults.concat(results);
      skip += BATCH_LIMIT;
    } catch (err) {
      console.error(`Error fetching batch at skip=${skip}:`, err.message || err);
      // Abort on network/parse error to avoid corrupt output
      break;
    }
  }

  try {
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify({ results: allResults }, null, 2),
      "utf8"
    );
    console.log(
      `Saved ${allResults.length} raw FDA recalls to ${OUTPUT_FILE}`
    );
  } catch (err) {
    console.error("Failed to write output file:", err.message || err);
  }
}

// Allow use as a module, but also support CLI execution.
if (require.main === module) {
  fetchFdaRecalls().catch((err) => {
    console.error("Fatal error in fetchFdaRecalls:", err);
    process.exitCode = 1;
  });
}

module.exports = { fetchFdaRecalls };
