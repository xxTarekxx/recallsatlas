/**
 * Backfill seoTitle, seoDescription, canonicalPath, canonicalUrl, hreflangUrls
 * on existing backend/database/cars/data/cars.json (no Mongo required).
 *
 * Run from repo root: cd frontend && npx tsx scripts/backfillCarsJsonSeo.ts
 */
import fs from "fs/promises";
import path from "path";
import { ensureVehicleRecallSeoOnRecord } from "../lib/cars/vehicleRecallSeoDefaults";

async function main() {
  const filePath = path.join(
    process.cwd(),
    "..",
    "backend",
    "database",
    "cars",
    "data",
    "cars.json"
  );
  const raw = await fs.readFile(filePath, "utf8");
  const list = JSON.parse(raw) as Record<string, unknown>[];
  if (!Array.isArray(list)) {
    throw new Error("cars.json must be a JSON array.");
  }
  const next = list.map((row) => ensureVehicleRecallSeoOnRecord(row));
  await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Updated ${next.length} record(s) in ${filePath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
