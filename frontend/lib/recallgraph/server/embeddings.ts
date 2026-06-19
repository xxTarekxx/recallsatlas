import crypto from "crypto";

const dimensions = Number(process.env.RECALLGRAPH_EMBEDDING_DIMENSIONS || 1536);
const openAiModel = process.env.RECALLGRAPH_OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
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

export async function embedSearchQuery(text: string) {
  if ((process.env.RECALLGRAPH_EMBEDDING_PROVIDER || "mock").toLowerCase() !== "openai") {
    return { model: `mock-hash-${dimensions}`, embedding: mockEmbedding(text) };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OpenAI query embeddings.");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.embeddings.create({ model: openAiModel, input: text });
  return { model: openAiModel, embedding: response.data[0].embedding };
}
