"use strict";

const fs = require("fs");
const path = require("path");

const SCRIPTS_ROOT = path.join(__dirname, "..");
const INPUT_RECALLS = path.join(SCRIPTS_ROOT, "recalls.json");
const INPUT_EEAT = path.join(SCRIPTS_ROOT, "recalls.eeat.json");
const OUTPUT_MERGED = path.join(SCRIPTS_ROOT, "recalls.merged.json");

function parseArgs() {
  const flags = process.argv.slice(2);
  const out = {
    recalls: INPUT_RECALLS,
    eeat: INPUT_EEAT,
    output: OUTPUT_MERGED,
  };

  for (const flag of flags) {
    if (flag.startsWith("--recalls=")) out.recalls = path.resolve(flag.slice(10));
    if (flag.startsWith("--eeat=")) out.eeat = path.resolve(flag.slice(7));
    if (flag.startsWith("--output=")) out.output = path.resolve(flag.slice(9));
  }

  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function main() {
  const opts = parseArgs();
  const recalls = readJson(opts.recalls);
  const eeat = readJson(opts.eeat);

  if (!Array.isArray(recalls) || !Array.isArray(eeat)) {
    throw new Error("Both recalls and EEAT files must be JSON arrays.");
  }

  const eeatBySlug = new Map(
    eeat
      .filter((record) => record && typeof record.slug === "string")
      .map((record) => [record.slug, record])
  );

  let merged = 0;
  let skipped = 0;

  const output = recalls.map((record) => {
    const match = eeatBySlug.get(record.slug);
    if (!match) {
      skipped += 1;
      return record;
    }

    merged += 1;
    return {
      ...record,
      content: Array.isArray(match.content) ? match.content : record.content,
      eeatMeta: match.eeatMeta ?? record.eeatMeta,
    };
  });

  writeJson(opts.output, output);

  console.log(`Recalls input: ${opts.recalls}`);
  console.log(`EEAT input:    ${opts.eeat}`);
  console.log(`Output:        ${opts.output}`);
  console.log(`Merged:        ${merged}`);
  console.log(`Skipped:       ${skipped}`);
}

main();
