const { closePool, withClient } = require("../lib/postgres");
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
    const links = linkCandidates(records, Number(process.env.RECALLGRAPH_RELATED_LIMIT || 8));
    let inserted = 0;

    await client.query("BEGIN");
    try {
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

    console.log(`Built ${inserted} related recall links from ${records.length} recalls.`);
  });
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
