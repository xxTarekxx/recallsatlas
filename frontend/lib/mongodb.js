// MongoDB connection helper for the Next.js frontend.
// Uses a cached client to avoid creating multiple connections
// across hot reloads and serverless invocations.

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn(
    "MONGODB_URI is not set. The frontend will not be able to query MongoDB."
  );
}

const DB_NAME = "recallsatlas";

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
};

let client;
let clientPromise;

if (!global._recallsAtlasMongoClient) {
  client = new MongoClient(uri || "mongodb://localhost:27017", MONGO_CLIENT_OPTIONS);
  clientPromise = client.connect();
  global._recallsAtlasMongoClient = clientPromise;
} else {
  clientPromise = global._recallsAtlasMongoClient;
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db(DB_NAME);
}

