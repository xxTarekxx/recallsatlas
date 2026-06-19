const fs = require("fs");
const path = require("path");
const { keywordSearch } = require("../search/semanticSearch");
const { readJson } = require("../lib/readJson");
const { writeJson } = require("../lib/writeJson");

const evaluationDir = path.resolve(__dirname, "../../data/evaluation");
const queriesPath = path.join(evaluationDir, "evaluation-queries.json");
const jsonReportPath = path.join(evaluationDir, "latest-evaluation-report.json");
const markdownReportPath = path.join(evaluationDir, "latest-evaluation-report.md");

function recallAt(results, expected, k) {
  if (!expected.length) return null;
  const returned = new Set(results.slice(0, k).map((result) => result.id));
  return expected.some((id) => returned.has(id)) ? 1 : 0;
}

function precisionAt(results, expected, k) {
  if (!expected.length) return null;
  const expectedSet = new Set(expected);
  const hits = results.slice(0, k).filter((result) => expectedSet.has(result.id)).length;
  return hits / k;
}

function reciprocalRank(results, expected) {
  if (!expected.length) return null;
  const expectedSet = new Set(expected);
  const index = results.findIndex((result) => expectedSet.has(result.id));
  return index >= 0 ? 1 / (index + 1) : 0;
}

function average(values) {
  const usable = values.filter((value) => typeof value === "number");
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function markdown(report) {
  const lines = [
    "# RecallGraph Search Evaluation",
    "",
    `Generated: ${report.generatedAt}`,
    `Search method: ${report.searchMethod}`,
    "",
    "## Summary",
    "",
    `- Queries: ${report.queryCount}`,
    `- Queries with results: ${report.queriesWithResults}`,
    `- Zero-result queries: ${report.zeroResultQueries}`,
    `- Average latency: ${report.averageLatencyMs} ms`,
    `- Recall@5: ${report.metrics.recallAt5 ?? "n/a"}`,
    `- Recall@10: ${report.metrics.recallAt10 ?? "n/a"}`,
    `- Precision@5: ${report.metrics.precisionAt5 ?? "n/a"}`,
    `- MRR: ${report.metrics.mrr ?? "n/a"}`,
    "",
    "## Query Results",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.query}`);
    lines.push("");
    lines.push(`Intent: ${result.intent || "n/a"}`);
    lines.push(`Latency: ${result.latencyMs} ms`);
    lines.push(`Results: ${result.resultCount}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function runSearchEvaluation() {
  const queries = readJson(queriesPath);
  const results = [];

  for (const query of queries) {
    const started = Date.now();
    const found = keywordSearch(query.query, { limit: 10, source: query.expectedSource });
    const latencyMs = Date.now() - started;
    const expected = query.expectedRecallIds || [];

    results.push({
      query: query.query,
      intent: query.intent,
      notes: query.notes,
      expectedRecallIds: expected,
      latencyMs,
      resultCount: found.length,
      topResults: found.slice(0, 10),
      recallAt5: recallAt(found, expected, 5),
      recallAt10: recallAt(found, expected, 10),
      precisionAt5: precisionAt(found, expected, 5),
      reciprocalRank: reciprocalRank(found, expected),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    searchMethod: "normalized-json-keyword-fallback",
    queryCount: queries.length,
    queriesWithResults: results.filter((result) => result.resultCount > 0).length,
    zeroResultQueries: results.filter((result) => result.resultCount === 0).length,
    averageLatencyMs: Number(average(results.map((result) => result.latencyMs))?.toFixed(2) || 0),
    metrics: {
      recallAt5: average(results.map((result) => result.recallAt5)),
      recallAt10: average(results.map((result) => result.recallAt10)),
      precisionAt5: average(results.map((result) => result.precisionAt5)),
      mrr: average(results.map((result) => result.reciprocalRank)),
    },
    results,
  };

  writeJson(jsonReportPath, report);
  fs.writeFileSync(markdownReportPath, markdown(report), "utf8");
  return report;
}

module.exports = { runSearchEvaluation };
