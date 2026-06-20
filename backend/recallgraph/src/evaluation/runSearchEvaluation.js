const fs = require("fs");
const path = require("path");
const { keywordSearch } = require("../search/semanticSearch");
const { getEmbeddingProvider, vectorLiteral } = require("../embed/embeddingProvider");
const { withClient } = require("../lib/postgres");
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
    `Embedding provider: ${report.embeddingProvider}`,
    `Embedding model: ${report.embeddingModel}`,
    `Fallback mode: ${report.fallback ? "yes" : "no"}`,
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

function hasDatabaseConfig() {
  return Boolean(process.env.RECALLGRAPH_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function toSearchResult(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    source: row.source,
    company: row.company_name,
    product: row.product_name || row.product_description,
    hazard: Array.isArray(row.hazards_json) ? row.hazards_json[0] || null : null,
    recallDate: row.recall_date ? new Date(row.recall_date).toISOString() : null,
    similarity: Number(Number(row.similarity || 0).toFixed(4)),
    sourceUrl: row.source_url,
  };
}

async function semanticSearch(client, provider, query, options = {}) {
  const embedding = await provider.embed(query);
  const values = [vectorLiteral(embedding), provider.model, Number(options.limit || 10)];
  const filters = ["e.embedding_scope = 'canonical'", "e.model = $2"];

  if (options.source) {
    values.push(options.source);
    filters.push(`r.source = $${values.length}`);
  }

  const { rows } = await client.query(
    `
      SELECT
        r.id, r.slug, r.title, r.source, r.company_name, r.product_name,
        r.product_description, r.hazards_json, r.recall_date, r.source_url,
        1 - (e.embedding <=> $1::vector) AS similarity
      FROM recall_embeddings e
      JOIN recalls r ON r.id = e.recall_id
      WHERE ${filters.join(" AND ")}
      ORDER BY e.embedding <=> $1::vector
      LIMIT $3
    `,
    values
  );

  return rows.map(toSearchResult);
}

async function runSearchEvaluation() {
  const queries = readJson(queriesPath);
  const results = [];
  const provider = getEmbeddingProvider();
  const useSemantic = hasDatabaseConfig() && provider.name !== "mock";
  let searchMethod = "normalized-json-keyword-fallback";

  const evaluateQuery = async (query, searcher) => {
    const started = Date.now();
    const found = await searcher(query);
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
  };

  if (useSemantic) {
    searchMethod = `pgvector-${provider.name}-${provider.model}`;
    await withClient(async (client) => {
      for (const query of queries) {
        await evaluateQuery(query, (item) =>
          semanticSearch(client, provider, item.query, { limit: 10, source: item.expectedSource })
        );
      }
    });
  } else {
    for (const query of queries) {
      await evaluateQuery(query, (item) =>
        keywordSearch(item.query, { limit: 10, source: item.expectedSource })
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    searchMethod,
    embeddingProvider: provider.name,
    embeddingModel: provider.model,
    fallback: !useSemantic,
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
