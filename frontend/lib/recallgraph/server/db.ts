import { createRequire } from "module";

const requireModule = createRequire(import.meta.url);
let pool: any;

function databaseUrl() {
  return process.env.RECALLGRAPH_DATABASE_URL || "";
}

function loadPg() {
  return requireModule("pg");
}

export function hasRecallGraphDatabase() {
  return Boolean(databaseUrl());
}

export async function queryRecallGraph<T = any>(sql: string, values: unknown[] = []): Promise<T[]> {
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error("RECALLGRAPH_DATABASE_URL is not configured.");

  if (!pool) {
    const { Pool } = loadPg();
    pool = new Pool({
      connectionString,
      ssl: process.env.RECALLGRAPH_DATABASE_SSL === "1" ? { rejectUnauthorized: false } : undefined,
    });
  }

  const result = await pool.query(sql, values);
  return result.rows as T[];
}
