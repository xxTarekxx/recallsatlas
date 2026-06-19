const { closePool, withClient } = require("../lib/postgres");

async function scalar(client, sql) {
  const { rows } = await client.query(sql);
  return Number(rows[0]?.count || 0);
}

async function main() {
  await withClient(async (client) => {
    const status = {
      recalls: await scalar(client, "SELECT count(*)::int AS count FROM recalls"),
      recallEmbeddings: await scalar(client, "SELECT count(*)::int AS count FROM recall_embeddings"),
      recallsWithEmbeddings: await scalar(
        client,
        "SELECT count(DISTINCT recall_id)::int AS count FROM recall_embeddings"
      ),
      relatedRecalls: await scalar(client, "SELECT count(*)::int AS count FROM related_recalls"),
      evaluationRuns: await scalar(client, "SELECT count(*)::int AS count FROM evaluation_runs"),
      latestImportRuns: await scalar(
        client,
        "SELECT count(*)::int AS count FROM ingestion_runs WHERE run_type = 'import_normalized'"
      ),
    };

    console.log(JSON.stringify(status, null, 2));
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
