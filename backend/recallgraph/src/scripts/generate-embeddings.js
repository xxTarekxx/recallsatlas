const { sha256 } = require("../lib/hash");
const { closePool, withClient } = require("../lib/postgres");
const { getEmbeddingProvider, vectorLiteral } = require("../embed/embeddingProvider");

async function main() {
  const provider = getEmbeddingProvider();
  let created = 0;
  let skipped = 0;

  await withClient(async (client) => {
    const { rows } = await client.query(
      "SELECT id, canonical_text FROM recalls WHERE canonical_text IS NOT NULL AND canonical_text <> '' ORDER BY published_at DESC NULLS LAST, id"
    );

    for (const row of rows) {
      const textHash = sha256(row.canonical_text);
      const existing = await client.query(
        "SELECT id FROM recall_embeddings WHERE recall_id = $1 AND embedding_scope = $2 AND model = $3 AND text_hash = $4 LIMIT 1",
        [row.id, "canonical", provider.model, textHash]
      );

      if (existing.rowCount) {
        skipped += 1;
        continue;
      }

      const embedding = await provider.embed(row.canonical_text);
      await client.query(
        `
          INSERT INTO recall_embeddings (recall_id, embedding_scope, model, dimensions, text_hash, embedding)
          VALUES ($1, $2, $3, $4, $5, $6::vector)
          ON CONFLICT (recall_id, embedding_scope, model, text_hash) DO NOTHING
        `,
        [row.id, "canonical", provider.model, provider.dimensions, textHash, vectorLiteral(embedding)]
      );
      created += 1;
    }
  });

  console.log(
    `RecallGraph embeddings complete. Provider=${provider.name}, model=${provider.model}, created=${created}, skipped=${skipped}.`
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { main };
