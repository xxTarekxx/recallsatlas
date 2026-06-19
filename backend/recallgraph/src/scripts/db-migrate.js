const fs = require("fs");
const path = require("path");
const { closePool, withClient } = require("../lib/postgres");

const migrationPath = path.resolve(__dirname, "../../../../db/migrations/001_recallgraph_init.sql");

async function main() {
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration not found: ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, "utf8");
  await withClient(async (client) => {
    await client.query(sql);
  });

  console.log(`Applied RecallGraph migration: ${migrationPath}`);
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
