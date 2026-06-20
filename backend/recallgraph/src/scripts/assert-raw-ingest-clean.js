"use strict";

const fs = require("fs");
const path = require("path");

const backendRoot = path.resolve(__dirname, "../../..");
const repoRoot = path.resolve(backendRoot, "..");

const scanTargets = [
  path.join(backendRoot, "fdaRecalls/scripts/scrape/scrapeRecalls.js"),
  path.join(backendRoot, "generalRecalls/scripts/fetch/fetchGeneralRecalls.js"),
  path.join(backendRoot, "recallgraph/src/ingest"),
];

const forbiddenTerms = [
  "OpenAI",
  "openai",
  "OPENAI_API_KEY",
  "chat.completions",
  "responses.create",
  "translate",
  "translation",
  "rewrite",
  "rewriting",
  "E-E-A-T",
  "eeat",
  "prompt",
];

function listFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  if (!stat.isDirectory()) return [];

  const files = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function main() {
  const failures = [];
  for (const filePath of scanTargets.flatMap(listFiles)) {
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      forbiddenTerms.forEach((term) => {
        if (line.includes(term)) {
          failures.push({ file: relative(filePath), line: index + 1, term });
        }
      });
    });
  }

  if (failures.length) {
    console.error("Raw ingest cleanliness check failed:");
    failures.forEach((failure) => {
      console.error(`- ${failure.file}:${failure.line} contains ${failure.term}`);
    });
    process.exit(1);
  }

  console.log("Raw ingest cleanliness check passed.");
}

if (require.main === module) {
  main();
}

module.exports = { main };
