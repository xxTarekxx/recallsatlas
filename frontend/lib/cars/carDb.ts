import { getMongoDb } from "@/lib/mongo";
import { mergeCarIntoCarsJsonFile } from "@/lib/cars/carsJson";

const COLLECTION = "cars";
let indexReady: Promise<void> | null = null;

async function ensureCarsIndex() {
  if (!indexReady) {
    indexReady = (async () => {
      const db = await getMongoDb();
      await db
        .collection(COLLECTION)
        .createIndex({ campaignNumber: 1 }, { unique: true, name: "campaignNumber_unique" });
    })();
  }
  return indexReady;
}

export async function getRecallFromDB(campaignNumber: string) {
  await ensureCarsIndex();
  const db = await getMongoDb();
  return db.collection(COLLECTION).findOne({ campaignNumber });
}

export async function saveRecallToDB(recall: Record<string, unknown>) {
  const campaignNumber = String(recall?.campaignNumber || "").trim();
  if (!campaignNumber) {
    throw new Error("campaignNumber is required for saveRecallToDB.");
  }

  await ensureCarsIndex();
  const db = await getMongoDb();
  const result = await db.collection(COLLECTION).updateOne(
    { campaignNumber },
    {
      $set: { ...recall, campaignNumber, updatedAt: new Date().toISOString() },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true }
  );

  try {
    const fresh = await db.collection(COLLECTION).findOne({ campaignNumber });
    if (fresh) {
      await mergeCarIntoCarsJsonFile(fresh as Record<string, unknown>);
    }
  } catch (e) {
    console.error("[carDb] cars.json mirror failed (Mongo save still ok):", e);
  }

  return result;
}

