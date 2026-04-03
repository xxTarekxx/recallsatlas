/**
 * Compare CSV Recall Number + Recall Heading vs testing2.json RecallNumber + Title.
 * Run: node verifyCsvJsonByRecallNumber.js
 */
const fs = require("fs");
const path = require("path");

const downloads = path.join(__dirname, "downloads");
const jsonPath = path.join(downloads, "testing2.json");

function norm(s) {
  if (s == null) return "";
  return String(s)
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/\u2013|\u2014/g, "-");
}

const raw = fs.readFileSync(jsonPath, "utf8");
const recalls = JSON.parse(raw);
const byNumber = new Map();
for (const r of recalls) {
  const n = norm(r.RecallNumber);
  if (n) byNumber.set(n, r);
}

// First CSV row per Recall Number (heading should be same everywhere)
const csvByNum = new Map();
for (const name of fs.readdirSync(downloads)) {
  if (!name.endsWith(".csv")) continue;
  const text = fs.readFileSync(path.join(downloads, name), "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) continue;
  const header = lines[0];
  const delim = header.includes("\t") ? "\t" : ",";
  // crude split for header keys only — full rows use regex for quoted CSV
  const headers = header.split(delim).map((h) => h.replace(/^"|"$/g, "").trim());
  const iNum = headers.indexOf("Recall Number");
  const iHead = headers.indexOf("Recall Heading");
  if (iNum < 0 || iHead < 0) continue;

  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]);
    if (row.length <= Math.max(iNum, iHead)) continue;
    const num = norm(row[iNum].replace(/^"|"$/g, ""));
    const heading = norm(row[iHead].replace(/^"|"$/g, ""));
    if (!num || csvByNum.has(num)) continue;
    csvByNum.set(num, heading);
  }
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

let inJson = 0;
let headingMatches = 0;
let headingMismatches = [];
let missingInJson = [];

for (const [num, csvHeading] of csvByNum) {
  const jr = byNumber.get(num);
  if (!jr) {
    missingInJson.push(num);
    continue;
  }
  inJson++;
  const jTitle = norm(jr.Title);
  if (jTitle === csvHeading) headingMatches++;
  else {
    headingMismatches.push({ num, csvHeading: csvHeading.slice(0, 120), jsonTitle: jTitle.slice(0, 120) });
  }
}

console.log("Unique Recall Numbers in CSVs:", csvByNum.size);
console.log("Found in testing2.json:", inJson);
console.log("Not in testing2.json:", missingInJson.length);
console.log("Title === Recall Heading (normalized):", headingMatches);
console.log("Mismatches:", headingMismatches.length);

if (headingMismatches.length) {
  console.log("\nFirst 5 mismatches:");
  headingMismatches.slice(0, 5).forEach((m) => {
    console.log("  #", m.num);
    console.log("    CSV:", m.csvHeading);
    console.log("    JSON:", m.jsonTitle);
  });
}
if (missingInJson.length && missingInJson.length <= 15) {
  console.log("Missing in JSON:", missingInJson.join(", "));
} else if (missingInJson.length) {
  console.log("Sample missing in JSON:", missingInJson.slice(0, 10).join(", "), "...");
}
