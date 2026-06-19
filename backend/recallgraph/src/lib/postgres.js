const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../..", "scripts", ".env") });

let pool;

function getPg() {
  try {
    return require("pg");
  } catch (error) {
    throw new Error("Missing dependency 'pg'. Run npm install in backend before using RecallGraph DB scripts.");
  }
}

function getDatabaseUrl() {
  return process.env.RECALLGRAPH_DATABASE_URL || process.env.DATABASE_URL || "";
}

function getPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("RECALLGRAPH_DATABASE_URL is required for RecallGraph database scripts.");
  }

  if (!pool) {
    const { Pool } = getPg();
    pool = new Pool({
      connectionString,
      ssl: process.env.RECALLGRAPH_DATABASE_SSL === "1" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function withClient(callback) {
  const client = await getPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { closePool, getDatabaseUrl, getPool, withClient };
