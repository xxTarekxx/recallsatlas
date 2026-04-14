/**
 * Read recalls.json, keep only English language payloads, write recall-en.json.
 *
 * Usage:
 *   node scripts/stripRecallsToEnglish.js
 */
const fs = require("fs");
const path = require("path");

const INPUT_PATH = path.join(__dirname, "recalls.json");
const OUTPUT_PATH = path.join(__dirname, "recall-en.json");

function keepEnglishOnly(recall) {
  if (!recall || typeof recall !== "object") return recall;

  const next = { ...recall };
  const langs = next.languages;

  if (langs && typeof langs === "object" && !Array.isArray(langs)) {
    const en = langs.en;
    next.languages = en && typeof en === "object" ? { en } : {};
  }

  return next;
}

function main() {
  const raw = fs.readFileSync(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected recalls.json to be a JSON array.");
  }

  const output = parsed.map(keepEnglishOnly);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Done: wrote ${output.length} recalls to ${OUTPUT_PATH}`);
}

main();
