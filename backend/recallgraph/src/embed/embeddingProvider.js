const { sha256 } = require("../lib/hash");

const OPENAI_MODEL = process.env.RECALLGRAPH_OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const OPENAI_DIMENSIONS = Number(process.env.RECALLGRAPH_EMBEDDING_DIMENSIONS || 1536);
const MOCK_MODEL = `mock-hash-${OPENAI_DIMENSIONS}`;

function mockEmbedding(text, dimensions = OPENAI_DIMENSIONS) {
  const values = [];
  let seed = sha256(text || "");
  while (values.length < dimensions) {
    seed = sha256(seed);
    for (let index = 0; index < seed.length && values.length < dimensions; index += 4) {
      const chunk = seed.slice(index, index + 4);
      const int = parseInt(chunk, 16);
      values.push((int / 0xffff) * 2 - 1);
    }
  }

  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => Number((value / magnitude).toFixed(8)));
}

async function openAiEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OpenAI embeddings.");
  }

  const OpenAI = require("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.embeddings.create({
    model: OPENAI_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

function getEmbeddingProvider() {
  const provider = (process.env.RECALLGRAPH_EMBEDDING_PROVIDER || "mock").toLowerCase();
  if (provider === "openai") {
    return {
      name: "openai",
      model: OPENAI_MODEL,
      dimensions: OPENAI_DIMENSIONS,
      embed: openAiEmbedding,
    };
  }

  return {
    name: "mock",
    model: MOCK_MODEL,
    dimensions: OPENAI_DIMENSIONS,
    embed: async (text) => mockEmbedding(text, OPENAI_DIMENSIONS),
  };
}

function vectorLiteral(values) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

module.exports = { getEmbeddingProvider, mockEmbedding, vectorLiteral };
