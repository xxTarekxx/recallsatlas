const path = require("path");
const { readJson } = require("../lib/readJson");
const { jaccard } = require("../graph/buildRelatedRecalls");

const normalizedPath = path.resolve(__dirname, "../../data/normalized/recalls.normalized.json");

function keywordSearch(query, options = {}) {
  const records = readJson(normalizedPath, []);
  const q = String(query || "").trim().toLowerCase();
  const limit = Number(options.limit || 10);

  return records
    .map((record) => {
      const text = [
        record.title,
        record.companyName,
        record.brandName,
        record.productName,
        record.productDescription,
        record.category,
        ...(record.hazards || []),
        record.description,
      ].join(" ");
      const score = q ? Math.max(jaccard(q, text), text.toLowerCase().includes(q) ? 0.7 : 0) : 0.1;
      return { record, score };
    })
    .filter(({ record, score }) => {
      if (q && score <= 0) return false;
      if (options.source && record.source !== options.source) return false;
      if (options.company && !(record.normalizedCompanyName || "").includes(String(options.company).toLowerCase())) return false;
      if (options.category && record.category !== options.category) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ record, score }) => ({
      id: record.id,
      slug: record.slug,
      title: record.title,
      source: record.source,
      company: record.companyName,
      product: record.productName || record.productDescription,
      hazard: (record.hazards || [])[0] || null,
      recallDate: record.recallDate,
      similarity: Number(score.toFixed(4)),
      sourceUrl: record.sourceUrl,
    }));
}

module.exports = { keywordSearch };
