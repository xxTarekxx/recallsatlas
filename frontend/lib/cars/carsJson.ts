import fs from "fs/promises";
import path from "path";
import { ensureVehicleRecallSeoOnRecord } from "@/lib/cars/vehicleRecallSeoDefaults";

function getCarsJsonPath(): string | null {
  const raw = process.env.CARS_JSON_PATH?.trim();
  const defaultDir = path.join(
    process.cwd(),
    "..",
    "backend",
    "database",
    "cars",
    "data"
  );
  if (raw === "0" || raw?.toLowerCase() === "false") {
    return null;
  }
  // Keep one static path for Turbopack tracing.
  return path.join(defaultDir, "cars.json");
}

function stripMongoFields(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
}

let writeQueue: Promise<void> = Promise.resolve();

/**
 * Upserts one campaign into the JSON array file (atomic rename). Best-effort; logs errors.
 */
export async function mergeCarIntoCarsJsonFile(doc: Record<string, unknown>): Promise<void> {
  const filePath = getCarsJsonPath();
  if (!filePath) return;

  const campaignNumber = String(doc.campaignNumber ?? "").trim();
  if (!campaignNumber) return;

  const payload = ensureVehicleRecallSeoOnRecord(stripMongoFields(doc));

  const run = async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    let list: Record<string, unknown>[] = [];
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const trimmed = raw.trim();
      if (trimmed) {
        const parsed = JSON.parse(trimmed);
        list = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch {
      list = [];
    }

    const idx = list.findIndex((r) => String(r.campaignNumber ?? "") === campaignNumber);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload, campaignNumber };
    } else {
      list.push({ ...payload, campaignNumber });
    }

    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(list, null, 2)}\n`, "utf8");
    await fs.rename(tmp, filePath);
  };

  writeQueue = writeQueue
    .then(run)
    .catch((e) => {
      console.error("[carsJson] mergeCarIntoCarsJsonFile failed:", e);
    });

  return writeQueue;
}
