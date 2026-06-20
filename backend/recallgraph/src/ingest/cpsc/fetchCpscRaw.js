"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { parseRawArgs } = require("../shared/args");
const { sourceHash } = require("../shared/sourceHash");
const { writeRunOutput } = require("../shared/writeRunOutput");

const CPSC_API_URL = "https://www.saferproducts.gov/RestWebServices/Recall";
const recallgraphRoot = path.resolve(__dirname, "../../..");
const latestOutputPath = path.join(recallgraphRoot, "data/raw/cpsc/cpsc-raw-latest.json");
const runsRoot = path.join(recallgraphRoot, "data/raw/runs");

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function normalizeSourceUrl(value) {
  const raw = cleanText(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw;
  }
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function fetchCpscRecords({ start, end }) {
  const url = `${CPSC_API_URL}?format=json&RecallDateStart=${encodeURIComponent(start)}&RecallDateEnd=${encodeURIComponent(end)}`;
  console.log(`[cpsc] Fetching ${url}`);
  const response = await axios.get(url, {
    timeout: 120000,
    headers: {
      Accept: "application/json",
      "User-Agent": "RecallsAtlas/1.0 (+https://recallsatlas.com)",
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function loadRecords(args) {
  if (args.input) {
    const inputPath = path.resolve(args.input);
    console.log(`[cpsc] Reading local source file ${inputPath}`);
    return readJson(inputPath);
  }
  return fetchCpscRecords(args);
}

function toRawRecord(record, fetchedAt) {
  const raw = {
    source: "cpsc",
    sourceRecordId: firstNonEmpty(record.RecallID, record.RecallNumber, record.URL) || null,
    RecallID: cleanText(record.RecallID) || null,
    RecallNumber: cleanText(record.RecallNumber) || null,
    RecallDate: cleanText(record.RecallDate) || null,
    LastPublishDate: cleanText(record.LastPublishDate) || null,
    URL: normalizeSourceUrl(record.URL),
    Title: cleanText(record.Title) || null,
    Description: cleanText(record.Description) || null,
    ConsumerContact: cleanText(record.ConsumerContact) || null,
    Products: asArray(record.Products),
    Images: asArray(record.Images),
    Injuries: asArray(record.Injuries),
    Manufacturers: asArray(record.Manufacturers),
    Retailers: asArray(record.Retailers),
    Importers: asArray(record.Importers),
    Distributors: asArray(record.Distributors),
    ProductUPCs: asArray(record.ProductUPCs),
    Hazards: asArray(record.Hazards),
    Remedies: asArray(record.Remedies),
    RemedyOptions: asArray(record.RemedyOptions),
    rawPayload: record,
    fetchedAt,
  };
  return { ...raw, sourceHash: sourceHash(raw) };
}

function newestFirst(a, b) {
  const dateA = cleanText(a.RecallDate || a.LastPublishDate);
  const dateB = cleanText(b.RecallDate || b.LastPublishDate);
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return cleanText(b.RecallID).localeCompare(cleanText(a.RecallID));
}

async function fetchCpscRaw(options = {}) {
  const args = { ...parseRawArgs({ limit: 100 }), ...options };
  const startedAt = new Date().toISOString();
  const fetchedAt = new Date().toISOString();
  const errors = [];
  const records = [];

  console.log(`[cpsc] Raw ingest starting. limit=${args.limit} dryRun=${args.dryRun ? "yes" : "no"}`);
  const sourceRecords = (await loadRecords(args)).sort(newestFirst).slice(0, args.limit);
  console.log(`[cpsc] Source records loaded: ${sourceRecords.length}`);

  for (const record of sourceRecords) {
    try {
      records.push(toRawRecord(record, fetchedAt));
    } catch (error) {
      errors.push({
        sourceRecordId: firstNonEmpty(record?.RecallID, record?.RecallNumber, record?.URL) || null,
        message: error.message,
      });
      console.warn(`[cpsc] skipped one record: ${error.message}`);
    }
  }

  const output = writeRunOutput({
    source: "cpsc",
    latestPath: latestOutputPath,
    customPath: args.out,
    runRoot: runsRoot,
    records,
    errors,
    startedAt,
    dryRun: args.dryRun,
  });

  console.log(`[cpsc] Raw ingest complete. records=${records.length} errors=${errors.length}`);
  if (args.dryRun) console.log("[cpsc] Dry run: no files written.");
  else output.outputFiles.forEach((file) => console.log(`[cpsc] wrote ${file}`));

  return output;
}

if (require.main === module) {
  fetchCpscRaw().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { fetchCpscRaw };
