/**
 * Flatten translated general recall category JSON files into one Mongo document per recall.
 *
 * Source:
 *   backend/scripts/generalRecalls/openaiTranslating/translatedJson/*.json
 *
 * Output:
 *   - writes a flattened JSON snapshot for inspection
 *   - upserts into recallsatlas.general_recalls
 *
 * Keeps:
 *   - categorySlugs: every category the recall appeared in
 *   - primaryCategorySlug: stable UI category for badges / grouping
 *
 * Run from backend/:
 *   node scripts/generalRecalls/flattenTranslatedGeneralRecallsToMongo.js
 *
 * Optional flags:
 *   --write-only   Write flattened JSON only, skip Mongo upserts
 *   --prune        Delete Mongo docs not present in the current flattened dataset
 */
const fs = require("fs");
const path = require("path");
const { getDb, close, DB_NAME } = require("../../database/mongodb");

const SOURCE_DIR = path.join(
  __dirname,
  "openaiTranslating",
  "translatedJson"
);
const OUTPUT_DIR = path.join(
  __dirname,
  "..",
  "..",
  "database",
  "generalRecalls"
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, "general_recalls.flattened.json");
const COLLECTION = "general_recalls";

const WRITE_ONLY = process.argv.includes("--write-only");
const PRUNE = process.argv.includes("--prune");

function listSourceFiles() {
  return fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => name.endsWith(".json") && name !== "imageUrlMap.json")
    .sort((a, b) => a.localeCompare(b));
}

function getCategorySlugFromFile(fileName) {
  return path.basename(fileName, ".json");
}

function getRecallSlug(recall) {
  const top = typeof recall?.slug === "string" ? recall.slug.trim() : "";
  if (top) return top;
  const legacy = typeof recall?.seo?.slug === "string" ? recall.seo.slug.trim() : "";
  return legacy || "";
}

function getRecallIdentityKey(recall) {
  const rn = typeof recall?.RecallNumber === "string" ? recall.RecallNumber.trim() : "";
  if (rn) return `rn:${rn}`;

  if (typeof recall?.RecallID === "number" && Number.isFinite(recall.RecallID)) {
    return `id:${recall.RecallID}`;
  }

  const url = typeof recall?.URL === "string" ? recall.URL.trim() : "";
  if (url) return `url:${url}`;

  const slug = getRecallSlug(recall);
  if (slug) return `slug:${slug}`;

  return "";
}

function parseDateMs(value) {
  if (typeof value !== "string" || !value.trim()) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function languageCount(recall) {
  const languages = recall?.languages;
  if (!languages || typeof languages !== "object") return 0;
  return Object.keys(languages).length;
}

function chooseBetterRecall(a, b) {
  const aTime = Math.max(
    parseDateMs(a?.lastTranslatedAt),
    parseDateMs(a?.LastPublishDate),
    parseDateMs(a?.RecallDate)
  );
  const bTime = Math.max(
    parseDateMs(b?.lastTranslatedAt),
    parseDateMs(b?.LastPublishDate),
    parseDateMs(b?.RecallDate)
  );
  if (aTime !== bTime) return bTime > aTime ? b : a;

  const aLangs = languageCount(a);
  const bLangs = languageCount(b);
  if (aLangs !== bLangs) return bLangs > aLangs ? b : a;

  const aSlug = getRecallSlug(a);
  const bSlug = getRecallSlug(b);
  return bSlug && (!aSlug || bSlug.localeCompare(aSlug) < 0) ? b : a;
}

function getPrimaryCategorySlug(categoryMetaList) {
  const sorted = [...categoryMetaList].sort((a, b) => {
    if (a.recallCount !== b.recallCount) return a.recallCount - b.recallCount;
    return a.slug.localeCompare(b.slug);
  });
  return sorted[0]?.slug || "";
}

function normalizeRecallDoc(recall, identityKey, categoryMetaList) {
  const categorySlugs = [...new Set(categoryMetaList.map((item) => item.slug))].sort((a, b) =>
    a.localeCompare(b)
  );
  const primaryCategorySlug = getPrimaryCategorySlug(categoryMetaList);
  const slug = getRecallSlug(recall);

  const doc = {
    ...recall,
    slug,
    categorySlugs,
    primaryCategorySlug,
    categorySources: categoryMetaList
      .map((item) => ({
        slug: item.slug,
        fileName: item.fileName,
        recallCount: item.recallCount,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    dedupeKey: identityKey,
    updatedAt: new Date().toISOString(),
  };

  delete doc._id;
  return doc;
}

function loadAndFlatten() {
  const files = listSourceFiles();
  const byIdentity = new Map();

  for (const fileName of files) {
    const fullPath = path.join(SOURCE_DIR, fileName);
    const categorySlug = getCategorySlugFromFile(fileName);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (error) {
      console.warn(`Skipping invalid JSON: ${fileName}`, error?.message || error);
      continue;
    }

    const recalls = Array.isArray(parsed?.recalls) ? parsed.recalls : [];
    const categoryMeta = {
      slug: categorySlug,
      fileName,
      recallCount: recalls.length,
    };

    for (const recall of recalls) {
      const identityKey = getRecallIdentityKey(recall);
      if (!identityKey) continue;

      const prev = byIdentity.get(identityKey);
      if (!prev) {
        byIdentity.set(identityKey, {
          recall,
          categoryMetaList: [categoryMeta],
        });
        continue;
      }

      prev.recall = chooseBetterRecall(prev.recall, recall);
      prev.categoryMetaList.push(categoryMeta);
    }
  }

  const flattened = [];
  for (const [identityKey, entry] of byIdentity.entries()) {
    const doc = normalizeRecallDoc(entry.recall, identityKey, entry.categoryMetaList);
    if (!doc.slug) continue;
    flattened.push(doc);
  }

  flattened.sort((a, b) => {
    const bt = Math.max(
      parseDateMs(b?.RecallDate),
      parseDateMs(b?.LastPublishDate),
      parseDateMs(b?.lastTranslatedAt)
    );
    const at = Math.max(
      parseDateMs(a?.RecallDate),
      parseDateMs(a?.LastPublishDate),
      parseDateMs(a?.lastTranslatedAt)
    );
    if (at !== bt) return bt - at;
    return String(a.slug || "").localeCompare(String(b.slug || ""));
  });

  return flattened;
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function writeFlattenedJson(flattened) {
  ensureOutputDir();
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(flattened, null, 2));
}

async function syncMongo(flattened) {
  const db = await getDb();
  const coll = db.collection(COLLECTION);

  await coll.createIndex({ slug: 1 }, { unique: true, name: "slug_unique" });
  await coll.createIndex({ RecallNumber: 1 }, { sparse: true, name: "RecallNumber_asc" });
  await coll.createIndex({ RecallID: 1 }, { sparse: true, name: "RecallID_asc" });
  await coll.createIndex({ URL: 1 }, { sparse: true, name: "URL_asc" });
  await coll.createIndex({ primaryCategorySlug: 1 }, { sparse: true, name: "primaryCategorySlug_asc" });
  await coll.createIndex({ categorySlugs: 1 }, { sparse: true, name: "categorySlugs_multikey" });
  await coll.createIndex({ RecallDate: -1 }, { sparse: true, name: "RecallDate_desc" });

  let upserts = 0;
  let updates = 0;
  const keepSlugs = new Set();

  for (const doc of flattened) {
    keepSlugs.add(doc.slug);
    const existing = await coll.findOne(
      { slug: doc.slug },
      { projection: { _id: 1, updatedAt: 1 } }
    );

    const updateDoc = {
      $set: doc,
      $setOnInsert: { createdAt: new Date().toISOString() },
    };
    const result = await coll.updateOne({ slug: doc.slug }, updateDoc, { upsert: true });
    if (result.upsertedCount) upserts += 1;
    else if (existing) updates += 1;
  }

  let pruned = 0;
  if (PRUNE) {
    const deleteResult = await coll.deleteMany({ slug: { $nin: [...keepSlugs] } });
    pruned = deleteResult.deletedCount || 0;
  }

  const total = await coll.countDocuments();
  return { upserts, updates, pruned, total };
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  const flattened = loadAndFlatten();
  writeFlattenedJson(flattened);

  console.log(
    `Flattened ${flattened.length} general recalls from ${SOURCE_DIR}\n` +
      `  wrote snapshot: ${OUTPUT_JSON}`
  );

  if (WRITE_ONLY) {
    console.log("Skipping Mongo sync (--write-only).");
    return;
  }

  const result = await syncMongo(flattened);
  console.log(
    `Done: ${DB_NAME}.${COLLECTION}\n` +
      `  upserts: ${result.upserts}\n` +
      `  updates: ${result.updates}\n` +
      `  pruned: ${result.pruned}\n` +
      `  total docs: ${result.total}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await close();
  });
