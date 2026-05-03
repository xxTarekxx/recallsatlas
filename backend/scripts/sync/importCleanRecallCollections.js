"use strict";

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const BACKEND_ROOT = path.join(__dirname, "..", "..");
const ENV_ROOT = path.join(BACKEND_ROOT, "scripts");

require("dotenv").config({
  path: fs.existsSync(path.join(ENV_ROOT, ".env"))
    ? path.join(ENV_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";
const DB_NAME = process.env.MONGODB_DB || "recallsatlas";

const IMPORTS = [
  {
    collection: "recalls",
    file: path.join(BACKEND_ROOT, "fdaRecalls", "data", "fda-recalls-en-eeat.json"),
    indexes: [
      [{ slug: 1 }, { unique: true, name: "slug_unique" }],
      [{ sortOrder: -1 }, { name: "sortOrder_desc" }],
      [{ datePublished: -1 }, { name: "datePublished_desc" }],
    ],
  },
  {
    collection: "generalRecalls",
    file: path.join(BACKEND_ROOT, "generalRecalls", "data", "general-recalls-en-eeat.json"),
    indexes: [
      [{ slug: 1 }, { unique: true, name: "slug_unique" }],
      [{ RecallNumber: 1 }, { unique: true, sparse: true, name: "RecallNumber_unique" }],
      [{ sortOrder: -1 }, { name: "sortOrder_desc" }],
      [{ RecallDate: -1 }, { name: "RecallDate_desc" }],
    ],
  },
];

function hasArg(name) {
  return process.argv.includes(name);
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing JSON file: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array: ${filePath}`);
  }
  return parsed.map((row) => {
    const doc = { ...row };
    delete doc._id;
    return doc;
  });
}

function assertUnique(rows, key, label) {
  const seen = new Set();
  for (const row of rows) {
    const value = row?.[key];
    if (value == null || String(value).trim() === "") continue;
    const normalized = String(value).trim();
    if (seen.has(normalized)) {
      throw new Error(`${label} has duplicate ${key}: ${normalized}`);
    }
    seen.add(normalized);
  }
}

async function replaceCollection(db, spec, rows) {
  const collection = db.collection(spec.collection);
  await collection.deleteMany({});
  if (rows.length) {
    await collection.insertMany(rows, { ordered: true });
  }
  for (const [keys, options] of spec.indexes) {
    await collection.createIndex(keys, options);
  }
  return collection.countDocuments();
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI or MONGO_URI in backend/scripts/.env or backend/.env");
  }

  const replace = hasArg("--replace");
  const rowsByCollection = new Map();

  for (const spec of IMPORTS) {
    const rows = readJsonArray(spec.file);
    assertUnique(rows, "slug", spec.collection);
    if (spec.collection === "generalRecalls") assertUnique(rows, "RecallNumber", spec.collection);
    rowsByCollection.set(spec.collection, rows);
    console.log(`${spec.collection}: ${rows.length} docs from ${spec.file}`);
  }

  if (!replace) {
    console.log("");
    console.log("Dry run only. Add --replace to delete existing docs and import these files.");
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    for (const spec of IMPORTS) {
      const rows = rowsByCollection.get(spec.collection);
      const total = await replaceCollection(db, spec, rows);
      console.log(`Replaced ${DB_NAME}.${spec.collection}: ${total} docs`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
