import { MongoClient, Db } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = "recallsatlas";

if (!MONGO_URI) {
  console.warn("MONGO_URI is not set. Mongo caching will be skipped.");
}

type GlobalMongoCache = {
  clientPromise?: Promise<MongoClient>;
};

const globalCache = globalThis as typeof globalThis & GlobalMongoCache;

let clientPromise: Promise<MongoClient> | null = null;

if (!globalCache.clientPromise) {
  const client = new MongoClient(MONGO_URI || "mongodb://localhost:27017");
  globalCache.clientPromise = client.connect();
}
clientPromise = globalCache.clientPromise;

export async function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    throw new Error("Mongo client is not initialized.");
  }
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

