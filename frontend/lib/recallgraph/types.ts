export type RecallGraphSource = "fda" | "cpsc" | "nhtsa";

export type RecallGraphImage = {
  url: string;
  alt?: string;
  source?: string;
};

export type RecallGraphRecord = {
  id: string;
  source: RecallGraphSource;
  sourceRecordId: string | null;
  sourceUrl: string;
  slug: string;
  title: string;
  description: string;
  recallDate: string | null;
  publishedAt: string | null;
  companyName: string | null;
  normalizedCompanyName: string | null;
  brandName: string | null;
  productName: string | null;
  productDescription: string | null;
  productType: string | null;
  category: string | null;
  hazards: string[];
  remedy: string | null;
  consumerAction: string | null;
  images: RecallGraphImage[];
  rawHash: string;
  canonicalTextForEmbedding: string;
  normalizedAt: string;
  rawRecord?: unknown;
};

export type RecallGraphPublicRecord = Omit<RecallGraphRecord, "rawRecord" | "canonicalTextForEmbedding">;

export type RecallGraphSearchParams = {
  q?: string;
  source?: string;
  company?: string;
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type RecallGraphSearchResult = {
  id: string;
  slug: string;
  title: string;
  source: string;
  company: string | null;
  product: string | null;
  category?: string | null;
  hazard: string | null;
  recallDate: string | null;
  similarity: number;
  sourceUrl: string;
  relatedCount?: number | null;
};

export type RecallGraphSearchResponse = {
  results: RecallGraphSearchResult[];
  mode: "semantic" | "keyword" | "fallback";
  fallback: boolean;
  embeddingStatus: RecallGraphEmbeddingStatus;
  fallbackReason?: "database_not_configured" | "database_unavailable" | "embedding_provider_unavailable" | "embedding_provider_mock" | "empty_query";
};

export type RecallGraphDatabaseStatus = "ok" | "not_configured" | "unreachable";
export type RecallGraphEmbeddingProviderLabel = "mock" | "openai" | "local" | "unknown";
export type RecallGraphEmbeddingStatus = "configured" | "demo" | "unknown";
export type RecallGraphDataMode = "database-backed" | "static-fallback";

export type RecallGraphStats = {
  totalRecalls: number;
  totalFdaRecalls: number;
  totalCpscRecalls: number;
  recallsBySource: Array<{ source: string; count: number }>;
  recallsByMonth: Array<{ month: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  topHazards: Array<{ hazard: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  missingImportantFields: {
    sourceUrl: number;
    date: number;
    company: number;
    hazards: number;
  };
  latestIngestionOrImportTimestamp: string | null;
  embeddingsCoverageCount: number;
  relatedLinksCount: number;
  evaluationQueryCount: number;
  databaseStatus: RecallGraphDatabaseStatus;
  embeddingStatus: RecallGraphEmbeddingStatus;
  dataMode: RecallGraphDataMode;
};

export type RecallGraphHealth = {
  ok: boolean;
  database: RecallGraphDatabaseStatus;
  recallCount: number;
  embeddingCount: number;
  relatedLinkCount: number;
  evaluationQueryCount: number;
  embeddingStatus: RecallGraphEmbeddingStatus;
};

export type RecallGraphRelatedRecall = RecallGraphSearchResult & {
  linkType: string;
  score: number;
  reason: string | null;
  method: string | null;
};

export type RecallGraphEvaluationReport = {
  generatedAt: string;
  searchMethod: string;
  embeddingProvider?: string;
  embeddingModel?: string;
  fallback?: boolean;
  queryCount: number;
  queriesWithResults: number;
  zeroResultQueries: number;
  averageLatencyMs: number;
  metrics: {
    recallAt5: number | null;
    recallAt10: number | null;
    precisionAt5: number | null;
    mrr: number | null;
  };
  results: Array<{
    query: string;
    intent?: string;
    latencyMs: number;
    resultCount: number;
  }>;
};
