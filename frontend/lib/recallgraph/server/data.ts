import fs from "fs/promises";
import path from "path";
import type {
  RecallGraphEvaluationReport,
  RecallGraphRecord,
  RecallGraphRelatedRecall,
  RecallGraphSearchParams,
  RecallGraphSearchResult,
  RecallGraphStats,
} from "@/lib/recallgraph/types";
import { hasRecallGraphDatabase, queryRecallGraph } from "./db";
import { embedSearchQuery, vectorLiteral } from "./embeddings";

let normalizedCache: RecallGraphRecord[] | null = null;

const normalizedPath = path.resolve(
  process.cwd(),
  "../backend/recallgraph/data/normalized/recalls.normalized.json"
);
const evaluationJsonPath = path.resolve(
  process.cwd(),
  "../backend/recallgraph/data/evaluation/latest-evaluation-report.json"
);
const evaluationMarkdownPath = path.resolve(
  process.cwd(),
  "../backend/recallgraph/data/evaluation/latest-evaluation-report.md"
);

function clean(value: string | null | undefined) {
  return String(value || "").trim();
}

function tokens(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
}

function jaccard(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / (left.size + right.size - overlap);
}

function normalizeLimit(limit: number | undefined) {
  const parsed = Number(limit || 10);
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 10, 1), 50);
}

async function loadNormalizedRecords() {
  if (normalizedCache) return normalizedCache;
  try {
    const raw = await fs.readFile(normalizedPath, "utf8");
    normalizedCache = JSON.parse(raw) as RecallGraphRecord[];
  } catch {
    normalizedCache = [];
  }
  return normalizedCache;
}

function toSearchResult(record: RecallGraphRecord, similarity = 0): RecallGraphSearchResult {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    source: record.source,
    company: record.companyName,
    product: record.productName || record.productDescription,
    hazard: record.hazards[0] || null,
    recallDate: record.recallDate,
    similarity,
    sourceUrl: record.sourceUrl,
  };
}

function rowToRecord(row: any): RecallGraphRecord {
  const normalized = row.normalized_record_json || row.normalizedRecordJson || {};
  return {
    id: row.id,
    source: row.source,
    sourceRecordId: row.source_record_id ?? normalized.sourceRecordId ?? null,
    sourceUrl: row.source_url ?? normalized.sourceUrl ?? "",
    slug: row.slug,
    title: row.title,
    description: row.description || "",
    recallDate: row.recall_date ? new Date(row.recall_date).toISOString() : normalized.recallDate ?? null,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : normalized.publishedAt ?? null,
    companyName: row.company_name ?? normalized.companyName ?? null,
    normalizedCompanyName: row.normalized_company_name ?? normalized.normalizedCompanyName ?? null,
    brandName: row.brand_name ?? normalized.brandName ?? null,
    productName: row.product_name ?? normalized.productName ?? null,
    productDescription: row.product_description ?? normalized.productDescription ?? null,
    productType: row.product_type ?? normalized.productType ?? null,
    category: row.category ?? normalized.category ?? null,
    hazards: Array.isArray(row.hazards_json) ? row.hazards_json : normalized.hazards ?? [],
    remedy: row.remedy ?? normalized.remedy ?? null,
    consumerAction: row.consumer_action ?? normalized.consumerAction ?? null,
    images: Array.isArray(row.images_json) ? row.images_json : normalized.images ?? [],
    rawHash: row.raw_hash ?? normalized.rawHash ?? "",
    canonicalTextForEmbedding: row.canonical_text ?? normalized.canonicalTextForEmbedding ?? "",
    normalizedAt: normalized.normalizedAt ?? "",
    rawRecord: row.raw_record_json ?? normalized.rawRecord,
  };
}

function passesFilters(record: RecallGraphRecord, params: RecallGraphSearchParams) {
  if (params.source && record.source !== params.source) return false;
  if (params.company) {
    const company = `${record.normalizedCompanyName || ""} ${record.companyName || ""}`.toLowerCase();
    if (!company.includes(params.company.toLowerCase())) return false;
  }
  if (params.category && record.category !== params.category) return false;
  if (params.from && record.recallDate && record.recallDate < params.from) return false;
  if (params.to && record.recallDate && record.recallDate > params.to) return false;
  return true;
}

async function searchJson(params: RecallGraphSearchParams): Promise<RecallGraphSearchResult[]> {
  const records = await loadNormalizedRecords();
  const q = clean(params.q).toLowerCase();
  const limit = normalizeLimit(params.limit);

  return records
    .filter((record) => passesFilters(record, params))
    .map((record) => {
      const text = [
        record.title,
        record.companyName,
        record.brandName,
        record.productName,
        record.productDescription,
        record.productType,
        record.category,
        ...(record.hazards || []),
        record.description,
      ].join(" ");
      const score = q ? Math.max(jaccard(q, text), text.toLowerCase().includes(q) ? 0.75 : 0) : 0.1;
      return { record, score };
    })
    .filter(({ score }) => !q || score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.record.publishedAt || b.record.recallDate || "").localeCompare(
        String(a.record.publishedAt || a.record.recallDate || "")
      );
    })
    .slice(0, limit)
    .map(({ record, score }) => toSearchResult(record, Number(score.toFixed(4))));
}

async function searchDbVector(params: RecallGraphSearchParams) {
  const q = clean(params.q);
  if (!q) return [];
  const { model, embedding } = await embedSearchQuery(q);
  const values: unknown[] = [vectorLiteral(embedding), model, normalizeLimit(params.limit)];
  const filters: string[] = ["e.embedding_scope = 'canonical'", "e.model = $2"];

  if (params.source) {
    values.push(params.source);
    filters.push(`r.source = $${values.length}`);
  }
  if (params.company) {
    values.push(`%${params.company.toLowerCase()}%`);
    filters.push(`lower(coalesce(r.normalized_company_name, r.company_name, '')) LIKE $${values.length}`);
  }
  if (params.category) {
    values.push(params.category);
    filters.push(`r.category = $${values.length}`);
  }
  if (params.from) {
    values.push(params.from);
    filters.push(`r.recall_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    filters.push(`r.recall_date <= $${values.length}`);
  }

  return queryRecallGraph<any>(
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
}

async function searchDbKeyword(params: RecallGraphSearchParams) {
  const q = clean(params.q);
  const terms = q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)
    .slice(0, 8);
  const values: unknown[] = [];
  const filters: string[] = ["1 = 1"];
  const searchableText =
    "lower(concat_ws(' ', r.title, r.canonical_text, r.company_name, r.product_name, r.product_description, r.product_type, r.category, r.hazards_json::text))";

  let scoreSql = "0.1::double precision";
  if (terms.length) {
    const termChecks = terms.map((term) => {
      values.push(`%${term}%`);
      return `${searchableText} LIKE $${values.length}`;
    });
    filters.push(`(${termChecks.join(" OR ")})`);
    scoreSql = `(${termChecks
      .map((check) => `CASE WHEN ${check} THEN 1 ELSE 0 END`)
      .join(" + ")})::double precision / ${terms.length}`;
  } else if (q) {
    values.push(`%${q.toLowerCase()}%`);
    filters.push(`${searchableText} LIKE $${values.length}`);
    scoreSql = `CASE WHEN ${searchableText} LIKE $${values.length} THEN 0.5 ELSE 0 END`;
  }

  if (params.source) {
    values.push(params.source);
    filters.push(`r.source = $${values.length}`);
  }
  if (params.company) {
    values.push(`%${params.company.toLowerCase()}%`);
    filters.push(`lower(coalesce(r.normalized_company_name, r.company_name, '')) LIKE $${values.length}`);
  }
  if (params.category) {
    values.push(params.category);
    filters.push(`r.category = $${values.length}`);
  }
  if (params.from) {
    values.push(params.from);
    filters.push(`r.recall_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    filters.push(`r.recall_date <= $${values.length}`);
  }

  values.push(normalizeLimit(params.limit));
  const limitParam = `$${values.length}`;

  return queryRecallGraph<any>(
    `
      SELECT
        r.id, r.slug, r.title, r.source, r.company_name, r.product_name,
        r.product_description, r.hazards_json, r.recall_date, r.source_url,
        ${scoreSql} AS similarity
      FROM recalls r
      WHERE ${filters.join(" AND ")}
      ORDER BY similarity DESC, r.published_at DESC NULLS LAST, r.recall_date DESC NULLS LAST
      LIMIT ${limitParam}
    `,
    values
  );
}

function rowToSearchResult(row: any): RecallGraphSearchResult {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    source: row.source,
    company: row.company_name ?? null,
    product: row.product_name || row.product_description || null,
    hazard: Array.isArray(row.hazards_json) ? row.hazards_json[0] || null : null,
    recallDate: row.recall_date ? new Date(row.recall_date).toISOString() : null,
    similarity: Number(Number(row.similarity || 0).toFixed(4)),
    sourceUrl: row.source_url || "",
  };
}

export async function searchRecallGraph(params: RecallGraphSearchParams = {}) {
  if (hasRecallGraphDatabase()) {
    try {
      const provider = (process.env.RECALLGRAPH_EMBEDDING_PROVIDER || "mock").toLowerCase();
      if (provider !== "mock") {
        const vectorRows = await searchDbVector(params);
        if (vectorRows.length) return vectorRows.map(rowToSearchResult);
      }
      const keywordRows = await searchDbKeyword(params);
      return keywordRows.map(rowToSearchResult);
    } catch (error) {
      console.warn("RecallGraph DB search unavailable, using normalized JSON fallback.", error);
    }
  }
  return searchJson(params);
}

export async function getRecallGraphStats(): Promise<RecallGraphStats> {
  if (hasRecallGraphDatabase()) {
    try {
      const [counts, topCompanies, topCategories, topHazards, byMonth, coverage, related, latest, missing] =
        await Promise.all([
          queryRecallGraph<any>(
            "SELECT source, count(*)::int AS count FROM recalls GROUP BY source ORDER BY source"
          ),
          queryRecallGraph<any>(
            "SELECT coalesce(company_name, 'Unknown') AS company, count(*)::int AS count FROM recalls GROUP BY company ORDER BY count DESC, company LIMIT 10"
          ),
          queryRecallGraph<any>(
            "SELECT coalesce(category, 'uncategorized') AS category, count(*)::int AS count FROM recalls GROUP BY category ORDER BY count DESC, category LIMIT 10"
          ),
          queryRecallGraph<any>(
            "SELECT value AS hazard, count(*)::int AS count FROM recalls, jsonb_array_elements_text(hazards_json) value GROUP BY value ORDER BY count DESC LIMIT 10"
          ),
          queryRecallGraph<any>(
            "SELECT to_char(date_trunc('month', coalesce(published_at, recall_date)), 'YYYY-MM') AS month, count(*)::int AS count FROM recalls WHERE coalesce(published_at, recall_date) IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 18"
          ),
          queryRecallGraph<any>("SELECT count(DISTINCT recall_id)::int AS count FROM recall_embeddings"),
          queryRecallGraph<any>("SELECT count(*)::int AS count FROM related_recalls"),
          queryRecallGraph<any>(
            "SELECT max(updated_at) AS latest FROM recalls"
          ),
          queryRecallGraph<any>(
            `
              SELECT
                count(*) FILTER (WHERE coalesce(source_url, '') = '')::int AS source_url,
                count(*) FILTER (WHERE recall_date IS NULL AND published_at IS NULL)::int AS date,
                count(*) FILTER (WHERE coalesce(company_name, '') = '')::int AS company,
                count(*) FILTER (WHERE jsonb_array_length(hazards_json) = 0)::int AS hazards
              FROM recalls
            `
          ),
        ]);

      const total = counts.reduce((sum, row) => sum + Number(row.count), 0);
      const sourceCount = (source: string) => counts.find((row) => row.source === source)?.count || 0;
      return {
        totalRecalls: total,
        totalFdaRecalls: Number(sourceCount("fda")),
        totalCpscRecalls: Number(sourceCount("cpsc")),
        recallsBySource: counts,
        recallsByMonth: byMonth.reverse(),
        topCompanies,
        topHazards,
        topCategories,
        missingImportantFields: {
          sourceUrl: Number(missing[0]?.source_url || 0),
          date: Number(missing[0]?.date || 0),
          company: Number(missing[0]?.company || 0),
          hazards: Number(missing[0]?.hazards || 0),
        },
        latestIngestionOrImportTimestamp: latest[0]?.latest
          ? new Date(latest[0].latest).toISOString()
          : null,
        embeddingsCoverageCount: Number(coverage[0]?.count || 0),
        relatedLinksCount: Number(related[0]?.count || 0),
        dataMode: "postgres",
      };
    } catch (error) {
      console.warn("RecallGraph DB stats unavailable, using normalized JSON fallback.", error);
    }
  }

  const records = await loadNormalizedRecords();
  const sourceCounts = new Map<string, number>();
  const companyCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const hazardCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();

  for (const record of records) {
    sourceCounts.set(record.source, (sourceCounts.get(record.source) || 0) + 1);
    if (record.companyName) companyCounts.set(record.companyName, (companyCounts.get(record.companyName) || 0) + 1);
    if (record.category) categoryCounts.set(record.category, (categoryCounts.get(record.category) || 0) + 1);
    for (const hazard of record.hazards || []) hazardCounts.set(hazard, (hazardCounts.get(hazard) || 0) + 1);
    const date = record.publishedAt || record.recallDate;
    if (date) {
      const month = date.slice(0, 7);
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    }
  }

  const top = (map: Map<string, number>, key: string) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([name, count]) => ({ [key]: name, count })) as any[];

  return {
    totalRecalls: records.length,
    totalFdaRecalls: sourceCounts.get("fda") || 0,
    totalCpscRecalls: sourceCounts.get("cpsc") || 0,
    recallsBySource: [...sourceCounts.entries()].map(([source, count]) => ({ source, count })),
    recallsByMonth: [...monthCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-18)
      .map(([month, count]) => ({ month, count })),
    topCompanies: top(companyCounts, "company"),
    topHazards: top(hazardCounts, "hazard"),
    topCategories: top(categoryCounts, "category"),
    missingImportantFields: {
      sourceUrl: records.filter((record) => !record.sourceUrl).length,
      date: records.filter((record) => !record.recallDate && !record.publishedAt).length,
      company: records.filter((record) => !record.companyName).length,
      hazards: records.filter((record) => !record.hazards.length).length,
    },
    latestIngestionOrImportTimestamp: records[0]?.normalizedAt || null,
    embeddingsCoverageCount: 0,
    relatedLinksCount: 0,
    dataMode: "normalized-json",
  };
}

export async function getRecallGraphRecallBySlug(slug: string) {
  if (hasRecallGraphDatabase()) {
    try {
      const rows = await queryRecallGraph<any>("SELECT * FROM recalls WHERE slug = $1 LIMIT 1", [slug]);
      if (rows[0]) return rowToRecord(rows[0]);
    } catch (error) {
      console.warn("RecallGraph DB detail unavailable, using normalized JSON fallback.", error);
    }
  }
  const records = await loadNormalizedRecords();
  return records.find((record) => record.slug === slug) || null;
}

export async function getRecallGraphRelated(id: string, limit = 8): Promise<RecallGraphRelatedRecall[]> {
  if (hasRecallGraphDatabase()) {
    try {
      const rows = await queryRecallGraph<any>(
        `
          SELECT
            r.id, r.slug, r.title, r.source, r.company_name, r.product_name, r.product_description,
            r.hazards_json, r.recall_date, r.source_url,
            rr.link_type, rr.score, rr.reason, rr.method
          FROM related_recalls rr
          JOIN recalls r ON r.id = rr.target_recall_id
          WHERE rr.source_recall_id = $1
          ORDER BY rr.score DESC
          LIMIT $2
        `,
        [id, limit]
      );
      if (rows.length) {
        return rows.map((row) => ({
          ...rowToSearchResult({ ...row, similarity: row.score }),
          linkType: row.link_type,
          score: Number(row.score),
          reason: row.reason,
          method: row.method,
        }));
      }
    } catch (error) {
      console.warn("RecallGraph DB related unavailable, using normalized JSON fallback.", error);
    }
  }

  const records = await loadNormalizedRecords();
  const source = records.find((record) => record.id === id);
  if (!source) return [];
  return records
    .filter((record) => record.id !== id)
    .map((record) => {
      const score = Math.max(
        source.normalizedCompanyName && source.normalizedCompanyName === record.normalizedCompanyName ? 0.7 : 0,
        jaccard(source.title, record.title),
        jaccard((source.hazards || []).join(" "), (record.hazards || []).join(" ")),
        jaccard(source.productName || source.productDescription || "", record.productName || record.productDescription || "")
      );
      return { record, score };
    })
    .filter(({ score }) => score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ record, score }) => ({
      ...toSearchResult(record, Number(score.toFixed(4))),
      linkType: score > 0.65 ? "same_company" : "semantic_related",
      score,
      reason: "Fallback match from shared company, hazard, product, or title text.",
      method: "normalized-json-fallback",
    }));
}

export async function getRecallGraphEvaluation() {
  let report: RecallGraphEvaluationReport | null = null;
  let markdown: string | null = null;
  try {
    report = JSON.parse(await fs.readFile(evaluationJsonPath, "utf8")) as RecallGraphEvaluationReport;
  } catch {
    report = null;
  }
  try {
    markdown = await fs.readFile(evaluationMarkdownPath, "utf8");
  } catch {
    markdown = null;
  }
  return { report, markdown };
}
