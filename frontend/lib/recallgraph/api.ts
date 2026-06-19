import type {
  RecallGraphEvaluationReport,
  RecallGraphRecord,
  RecallGraphRelatedRecall,
  RecallGraphSearchParams,
  RecallGraphSearchResult,
  RecallGraphStats,
} from "./types";

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`RecallGraph request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function searchRecallGraphApi(params: RecallGraphSearchParams) {
  return readJson<{ results: RecallGraphSearchResult[] }>(
    withQuery("/api/recallgraph/search", params)
  );
}

export function getRecallGraphStatsApi() {
  return readJson<RecallGraphStats>("/api/recallgraph/stats");
}

export function getRecallGraphRecallApi(slug: string) {
  return readJson<RecallGraphRecord>(`/api/recallgraph/recalls/${encodeURIComponent(slug)}`);
}

export function getRecallGraphRelatedApi(id: string) {
  return readJson<{ related: RecallGraphRelatedRecall[] }>(
    `/api/recallgraph/related/${encodeURIComponent(id)}`
  );
}

export function getRecallGraphEvaluationApi() {
  return readJson<{ report: RecallGraphEvaluationReport | null; markdown: string | null }>(
    "/api/recallgraph/evaluation"
  );
}
