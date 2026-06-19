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
const normalizedOutputPath = path.join(recallgraphRoot, "data/normalized/recalls.normalized.json");
const reportOutputPath = path.join(recallgraphRoot, "data/normalized/normalization-report.json");

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
  const fdaRecords = readJson(fdaInputPath);
  const generalRecords = readJson(generalInputPath);

  if (!Array.isArray(fdaRecords)) throw new Error(`Expected array in ${fdaInputPath}`);
  if (!Array.isArray(generalRecords)) throw new Error(`Expected array in ${generalInputPath}`);

  const normalizedAt = new Date().toISOString();
  const normalized = [
    ...fdaRecords.map((record) => normalizeFdaRecall(record, normalizedAt)),
    ...generalRecords.map((record) => normalizeGeneralRecall(record, normalizedAt)),
  ];

  ensureUniqueSlugs(normalized);

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    inputFiles: {
      fda: fdaInputPath,
      general: generalInputPath,
    },
    totalInputFdaRecords: fdaRecords.length,
    totalInputGeneralRecords: generalRecords.length,
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
    `RecallGraph normalized ${normalized.length} records (${fdaRecords.length} FDA, ${generalRecords.length} CPSC).`
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
