import { MongoClient, Db } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = "recallsatlas";

if (!MONGO_URI) {
  console.warn("MONGO_URI is not set. Mongo caching will be skipped.");
}

/** Shared MongoClient options — timeouts prevent indefinitely-hanging queries. */
const MONGO_CLIENT_OPTIONS = {
  /** Fail fast if the server can't be reached (default is 30 s). */
  serverSelectionTimeoutMS: 30000,
  /** TCP connect timeout. */
  connectTimeoutMS: 30000,
  /**
   * No socketTimeoutMS — rely on maxTimeMS on individual queries instead.
   * A socket-level timeout cuts off slow Atlas responses mid-flight;
   * maxTimeMS aborts cleanly server-side after the allowed duration.
   */
  /** Keep a small pool; most Next.js pages fire 1–3 concurrent queries. */
  maxPoolSize: 10,
  minPoolSize: 1,
  /** Auto-retry once on transient network blips. */
  retryWrites: true,
  retryReads: true,
} as const;

type GlobalMongoCache = {
  clientPromise?: Promise<MongoClient>;
};

const globalCache = globalThis as typeof globalThis & GlobalMongoCache;

let clientPromise: Promise<MongoClient> | null = null;

if (!globalCache.clientPromise) {
  const client = new MongoClient(MONGO_URI || "mongodb://localhost:27017", MONGO_CLIENT_OPTIONS);
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

