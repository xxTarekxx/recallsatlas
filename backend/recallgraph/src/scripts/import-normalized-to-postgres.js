const path = require("path");
const { readJson } = require("../lib/readJson");
const { closePool, withClient } = require("../lib/postgres");
const { upsertRecall } = require("../import/upsertRecall");

const normalizedPath = path.resolve(__dirname, "../../data/normalized/recalls.normalized.json");

async function main() {
  const records = readJson(normalizedPath);
  if (!Array.isArray(records)) throw new Error(`Expected array in ${normalizedPath}`);

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `
          INSERT INTO ingestion_runs (source, run_type, started_at, status, metadata_json)
          VALUES ($1, $2, now(), $3, $4::jsonb)
          RETURNING id
        `,
        ["recallgraph", "import_normalized", "running", JSON.stringify({ normalizedPath })]
      );

      let imported = 0;
      for (const record of records) {
        try {
          await upsertRecall(client, record);
          imported += 1;
        } catch (error) {
          console.error(`Failed to import ${record.id}: ${error.message}`);
        }
      }

      await client.query(
        `
          UPDATE ingestion_runs
          SET finished_at = now(), status = $1, record_count = $2
          WHERE id = (SELECT max(id) FROM ingestion_runs WHERE run_type = 'import_normalized')
        `,
        ["completed", imported]
      );
      await client.query("COMMIT");
      console.log(`Imported ${imported} RecallGraph records into Postgres.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
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
