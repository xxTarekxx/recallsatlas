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

let client;
let clientPromise;

if (!global._recallsAtlasMongoClient) {
  client = new MongoClient(uri || "mongodb://localhost:27017");
  clientPromise = client.connect();
  global._recallsAtlasMongoClient = clientPromise;
} else {
  clientPromise = global._recallsAtlasMongoClient;
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db(DB_NAME);
}

