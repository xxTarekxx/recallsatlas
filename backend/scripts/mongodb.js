/**
 * MongoDB connector for RecallsAtlas.
 * Database: recallsatlas
 * Collection: recalls
 * Use connection pooling for production.
 */

// Prefer backend/scripts/.env, then backend/.env
const path = require("path");
const fs = require("fs");
const envScripts = path.join(__dirname, "..", "scripts", ".env");
const envBackend = path.join(__dirname, "..", ".env");
require("dotenv").config({
  path: fs.existsSync(envScripts) ? envScripts : envBackend,
});

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "recallsatlas";
const COLLECTION_RECALLS = "recalls";

let client = null;
let db = null;

/**
 * Get MongoDB client (singleton).
 */
async function getClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

/**
 * Get database instance.
 */
async function getDb() {
  if (!db) {
    const c = await getClient();
    db = c.db(DB_NAME);
  }
  return db;
}

/**
 * Get recalls collection.
 */
async function getRecallsCollection() {
  const database = await getDb();
  return database.collection(COLLECTION_RECALLS);
}

/**
 * Close connection (call on graceful shutdown).
 */
async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  getClient,
  getDb,
  getRecallsCollection,
  close,
  DB_NAME,
  COLLECTION_RECALLS,
};
