import crypto from "crypto";
import OpenAI from "openai";

const dimensions = Number(process.env.RECALLGRAPH_EMBEDDING_DIMENSIONS || 1536);
const openAiModel = process.env.RECALLGRAPH_OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const configuredMaxQueryCacheEntries = Number(process.env.RECALLGRAPH_QUERY_EMBEDDING_CACHE_SIZE || 128);
const configuredMaxQueryChars = Number(process.env.RECALLGRAPH_MAX_QUERY_EMBED_CHARS || 1000);
const maxQueryCacheEntries =
  Number.isFinite(configuredMaxQueryCacheEntries) && configuredMaxQueryCacheEntries > 0
    ? Math.floor(configuredMaxQueryCacheEntries)
    : 128;
const maxQueryChars =
  Number.isFinite(configuredMaxQueryChars) && configuredMaxQueryChars > 0
    ? Math.floor(configuredMaxQueryChars)
    : 1000;

type QueryEmbedding = { model: string; embedding: number[] };

let openAiClient: OpenAI | null = null;
const queryEmbeddingCache = new Map<string, Promise<QueryEmbedding>>();

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizedQuery(text: string) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, maxQueryChars);
}

function mockEmbedding(text: string) {
  const values: number[] = [];
  let seed = sha256(text || "");
  while (values.length < dimensions) {
    seed = sha256(seed);
    for (let index = 0; index < seed.length && values.length < dimensions; index += 4) {
      const int = parseInt(seed.slice(index, index + 4), 16);
      values.push((int / 0xffff) * 2 - 1);
    }
  }
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => Number((value / magnitude).toFixed(8)));
}

export function vectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function cacheQueryEmbedding(key: string, value: Promise<QueryEmbedding>) {
  queryEmbeddingCache.set(key, value);
  if (queryEmbeddingCache.size > maxQueryCacheEntries) {
    const oldestKey = queryEmbeddingCache.keys().next().value;
    if (oldestKey) queryEmbeddingCache.delete(oldestKey);
  }
  value.catch(() => queryEmbeddingCache.delete(key));
}

async function createOpenAiQueryEmbedding(query: string): Promise<QueryEmbedding> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OpenAI query embeddings.");
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  const response = await openAiClient.embeddings.create({ model: openAiModel, input: query });
  return { model: openAiModel, embedding: response.data[0].embedding };
}

export async function embedSearchQuery(text: string) {
  const query = normalizedQuery(text);
  if (!query) {
    throw new Error("RecallGraph search query is empty.");
  }

  const provider = (process.env.RECALLGRAPH_EMBEDDING_PROVIDER || "mock").toLowerCase();
  const model = provider === "openai" ? openAiModel : `mock-hash-${dimensions}`;
  const cacheKey = `${provider}:${model}:${query}`;
  const cached = queryEmbeddingCache.get(cacheKey);
  if (cached) return cached;

  const embeddingPromise =
    provider === "openai"
      ? createOpenAiQueryEmbedding(query)
      : Promise.resolve({ model, embedding: mockEmbedding(query) });

  cacheQueryEmbedding(cacheKey, embeddingPromise);
  return embeddingPromise;
}
