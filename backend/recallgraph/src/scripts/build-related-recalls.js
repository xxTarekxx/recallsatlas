const { closePool, withClient } = require("../lib/postgres");
const { getEmbeddingProvider } = require("../embed/embeddingProvider");
const { linkCandidates } = require("../graph/buildRelatedRecalls");

async function loadRecords(client) {
  const { rows } = await client.query(
    `
      SELECT
        id, source, source_url AS "sourceUrl", title, normalized_company_name AS "normalizedCompanyName",
        product_name AS "productName", product_description AS "productDescription",
        hazards_json AS hazards
      FROM recalls
      ORDER BY published_at DESC NULLS LAST, recall_date DESC NULLS LAST, id
    `
  );
  return rows.map((row) => ({ ...row, hazards: Array.isArray(row.hazards) ? row.hazards : [] }));
}

async function main() {
  await withClient(async (client) => {
    const records = await loadRecords(client);
    const limitPerRecall = Number(process.env.RECALLGRAPH_RELATED_LIMIT || 8);
    const provider = getEmbeddingProvider();
    const ruleLinks = linkCandidates(records, limitPerRecall);
    const vectorLinks = await loadVectorLinks(
      client,
      provider.model,
      Number(process.env.RECALLGRAPH_VECTOR_RELATED_CANDIDATES || 12),
      Number(process.env.RECALLGRAPH_VECTOR_RELATED_MIN_SIMILARITY || 0.45)
    );
    const links = mergeLinks(ruleLinks, vectorLinks, limitPerRecall);
    let inserted = 0;

    await client.query("BEGIN");
    try {
      await client.query("DELETE FROM related_recalls");
      for (const link of links) {
        await client.query(
          `
            INSERT INTO related_recalls (
              source_recall_id, target_recall_id, link_type, score, reason, method
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (source_recall_id, target_recall_id, link_type) DO UPDATE SET
              score = EXCLUDED.score,
              reason = EXCLUDED.reason,
              method = EXCLUDED.method,
              created_at = now()
          `,
          [
            link.sourceRecallId,
            link.targetRecallId,
            link.linkType,
            link.score,
            link.reason,
            link.method,
          ]
        );
        inserted += 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log(
      `Built ${inserted} related recall links from ${records.length} recalls. ` +
        `rules=${ruleLinks.length}, vector=${vectorLinks.length}, model=${provider.model}.`
    );
  });
}

async function loadVectorLinks(client, model, candidatesPerRecall, minSimilarity) {
  const { rows } = await client.query(
    `
      WITH source_embeddings AS (
        SELECT recall_id, embedding
        FROM recall_embeddings
        WHERE embedding_scope = 'canonical' AND model = $1
      )
      SELECT
        source_recall_id AS "sourceRecallId",
        target_recall_id AS "targetRecallId",
        'semantic_related' AS "linkType",
        round(score::numeric, 4)::float8 AS score,
        'Nearest recall by vector embedding similarity' AS reason,
        $4 AS method
      FROM (
        SELECT
          source.recall_id AS source_recall_id,
          target.recall_id AS target_recall_id,
          1 - (source.embedding <=> target.embedding) AS score
        FROM source_embeddings source
        JOIN LATERAL (
          SELECT recall_id, embedding
          FROM source_embeddings candidate
          WHERE candidate.recall_id <> source.recall_id
          ORDER BY source.embedding <=> candidate.embedding
          LIMIT $2
        ) target ON true
      ) ranked
      WHERE score >= $3
    `,
    [model, candidatesPerRecall, minSimilarity, `recallgraph-vector-${model}`]
  );

  return rows;
}

function mergeLinks(ruleLinks, vectorLinks, limitPerRecall) {
  const bySource = new Map();

  for (const link of [...vectorLinks, ...ruleLinks]) {
    const sourceLinks = bySource.get(link.sourceRecallId) || new Map();
    const key = `${link.sourceRecallId}:${link.targetRecallId}`;
    const existing = sourceLinks.get(key);
    if (!existing || link.score > existing.score) {
      sourceLinks.set(key, link);
    }
    bySource.set(link.sourceRecallId, sourceLinks);
  }

  return [...bySource.values()]
    .flatMap((sourceLinks) =>
      [...sourceLinks.values()]
        .sort((a, b) => b.score - a.score || a.targetRecallId.localeCompare(b.targetRecallId))
        .slice(0, limitPerRecall)
    )
    .filter((link) => link.score > 0);
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
