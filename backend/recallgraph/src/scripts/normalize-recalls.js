const path = require("path");
const { readJson } = require("../lib/readJson");
const { writeJson } = require("../lib/writeJson");
const { normalizeFdaRecall } = require("../normalize/normalizeFdaRecall");
const { normalizeGeneralRecall } = require("../normalize/normalizeGeneralRecall");

const recallgraphRoot = path.resolve(__dirname, "../..");
const fdaInputPath = path.join(
  recallgraphRoot,
  "data/imports/dollarsandlife/fda/fda-recalls-en-eeat.json"
);
const generalInputPath = path.join(
  recallgraphRoot,
  "data/imports/dollarsandlife/general/general-recalls-en-eeat.json"
);
const rawFdaInputPath = path.join(recallgraphRoot, "data/raw/fda/fda-raw-latest.json");
const rawCpscInputPath = path.join(recallgraphRoot, "data/raw/cpsc/cpsc-raw-latest.json");
const normalizedOutputPath = path.join(recallgraphRoot, "data/normalized/recalls.normalized.json");
const reportOutputPath = path.join(recallgraphRoot, "data/normalized/normalization-report.json");

function readJsonArray(filePath) {
  const records = readJson(filePath, []);
  if (!Array.isArray(records)) throw new Error(`Expected array in ${filePath}`);
  return records;
}

function loadRecordGroups(groups) {
  return groups
    .map((group) => ({ ...group, records: readJsonArray(group.path) }))
    .filter((group) => group.records.length > 0);
}

function recordKey(record) {
  if (record.sourceUrl) return `${record.source}:url:${record.sourceUrl.toLowerCase()}`;
  if (record.sourceRecordId) return `${record.source}:record:${String(record.sourceRecordId).toLowerCase()}`;
  return `${record.source}:id:${record.id}`;
}

function dedupeNormalized(records) {
  const seen = new Set();
  const output = [];
  for (const record of records) {
    const key = recordKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output;
}

function countDuplicates(records, key) {
  const counts = new Map();
  for (const record of records) {
    const value = record[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function ensureUniqueSlugs(records) {
  const seen = new Map();
  for (const record of records) {
    const first = seen.get(record.slug);
    if (!first) {
      seen.set(record.slug, record.id);
      continue;
    }
    record.slug = `${record.slug}-${record.rawHash.slice(0, 8)}`;
  }
}

function badExamples(records) {
  return records
    .filter(
      (record) =>
        !record.sourceUrl ||
        !record.recallDate ||
        !record.companyName ||
        !record.hazards.length ||
        !record.canonicalTextForEmbedding
    )
    .slice(0, 20)
    .map((record) => ({
      id: record.id,
      source: record.source,
      slug: record.slug,
      title: record.title,
      missing: [
        !record.sourceUrl && "sourceUrl",
        !record.recallDate && "recallDate",
        !record.companyName && "companyName",
        !record.hazards.length && "hazards",
        !record.canonicalTextForEmbedding && "canonicalTextForEmbedding",
      ].filter(Boolean),
    }));
}

function main() {
  const startedAt = new Date().toISOString();
  const fdaGroups = loadRecordGroups([
    { label: "legacy_fda_baseline", path: fdaInputPath },
    { label: "raw_fda_latest", path: rawFdaInputPath },
  ]);
  const generalGroups = loadRecordGroups([
    { label: "legacy_cpsc_baseline", path: generalInputPath },
    { label: "raw_cpsc_latest", path: rawCpscInputPath },
  ]);
  const fdaRecords = fdaGroups.flatMap((group) => group.records);
  const generalRecords = generalGroups.flatMap((group) => group.records);

  const normalizedAt = new Date().toISOString();
  const normalizedBeforeDedupe = [
    ...fdaRecords.map((record) => normalizeFdaRecall(record, normalizedAt)),
    ...generalRecords.map((record) => normalizeGeneralRecall(record, normalizedAt)),
  ];
  const normalized = dedupeNormalized(normalizedBeforeDedupe);

  ensureUniqueSlugs(normalized);

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    inputFiles: {
      fda: fdaGroups.map((group) => ({ label: group.label, path: group.path, records: group.records.length })),
      general: generalGroups.map((group) => ({ label: group.label, path: group.path, records: group.records.length })),
    },
    totalInputFdaRecords: fdaRecords.length,
    totalInputGeneralRecords: generalRecords.length,
    totalBeforeDedupe: normalizedBeforeDedupe.length,
    duplicateRecordsSkipped: normalizedBeforeDedupe.length - normalized.length,
    totalOutputRecords: normalized.length,
    missingSourceUrls: normalized.filter((record) => !record.sourceUrl).length,
    missingDates: normalized.filter((record) => !record.recallDate && !record.publishedAt).length,
    missingCompanyNames: normalized.filter((record) => !record.companyName).length,
    missingHazardsOrReasons: normalized.filter((record) => !record.hazards.length).length,
    duplicateSourceUrls: countDuplicates(normalized, "sourceUrl"),
    duplicateSlugs: countDuplicates(normalized, "slug"),
    examplesOfBadRecords: badExamples(normalized),
  };

  writeJson(normalizedOutputPath, normalized);
  writeJson(reportOutputPath, report);

  console.log(
    `RecallGraph normalized ${normalized.length} records (${fdaRecords.length} FDA, ${generalRecords.length} CPSC, ${normalizedBeforeDedupe.length - normalized.length} duplicate skipped).`
  );
  console.log(`Wrote ${normalizedOutputPath}`);
  console.log(`Wrote ${reportOutputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = { main };
