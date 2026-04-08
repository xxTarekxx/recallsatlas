/**
 * Upsert every *.json in `translatedJson/` next to this script
 * into MongoDB database `recallsatlas`, collection `general`.
 *
 * One document per category (unique categorySlug). Per recall:
 *   - Dedupes duplicate rows in the same JSON (same RecallID / RecallNumber / slug).
 *   - Skips the Mongo write if payload hash matches the stored document (no duplicate upload).
 *   - Optionally warns if a recall ID already exists under another category document.
 *
 * Requires MONGODB_URI (see backend/scripts/.env or backend/.env).
 *
 * Run from backend/:
 *   node scripts/generalRecalls/openaiTranslating/pushGeneralRecallsToMongo.js
 *
 * Options:
 *   --dry-run   Log actions only, no writes (still reads Mongo for skip/conflict checks)
 *   --verbose   Print one line per file (default: single progress line on TTY)
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

require("dotenv").config({
  path: fs.existsSync(path.join(__dirname, "..", "..", "..", "scripts", ".env"))
    ? path.join(__dirname, "..", "..", "..", "scripts", ".env")
    : path.join(__dirname, "..", "..", "..", ".env"),
});

const { getDb, close, DB_NAME } = require("../../../database/mongodb");

const TRANSLATED_JSON_DIR = path.join(__dirname, "translatedJson");
const COLLECTION = "general";

const t = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((ent) => ent.isFile() && ent.name.endsWith(".json"))
    .map((ent) => path.join(dir, ent.name));
}

/** Path like `translatedJson/foo.json` relative to openaiTranslating. */
function relForDoc(abs) {
  return path.relative(__dirname, abs).replace(/\\/g, "/");
}

/** Stable identity for a recall within a category file (first wins on dupes). */
function recallIdentity(r) {
  if (r == null || typeof r !== "object") return null;
  if (r.RecallID != null && Number.isFinite(Number(r.RecallID))) {
    return `id:${Number(r.RecallID)}`;
  }
  const n = r.RecallNumber != null ? String(r.RecallNumber).trim() : "";
  if (n) return `num:${n}`;
  const s = r.slug != null ? String(r.slug).trim() : "";
  if (s) return `slug:${s}`;
  const u = r.URL != null ? String(r.URL).trim() : "";
  if (u) return `url:${u}`;
  return null;
}

/**
 * Drop duplicate recall rows in one array (same RecallID etc.).
 * @returns {{ recalls: object[], dropped: number }}
 */
function dedupeRecalls(recalls) {
  if (!Array.isArray(recalls)) return { recalls: [], dropped: 0 };
  const seen = new Set();
  const out = [];
  let dropped = 0;
  for (const r of recalls) {
    const key = recallIdentity(r);
    if (key == null) {
      out.push(r);
      continue;
    }
    if (seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    out.push(r);
  }
  return { recalls: out, dropped };
}

function numericRecallIds(recalls) {
  const ids = [];
  for (const r of recalls) {
    if (r != null && r.RecallID != null && Number.isFinite(Number(r.RecallID))) {
      ids.push(Number(r.RecallID));
    }
  }
  return ids;
}

function payloadHash(meta, recalls) {
  const payload = JSON.stringify({ meta: meta ?? {}, recalls: recalls ?? [] });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Find recalls in this category that already appear on another category document.
 * Uses aggregation so we do not load full `recalls` payloads for large categories.
 */
async function findCrossCategoryOverlaps(coll, categorySlug, recallIds) {
  if (!recallIds.length) return [];
  const uniq = [...new Set(recallIds)];
  const rows = await coll
    .aggregate([
      {
        $match: {
          categorySlug: { $ne: categorySlug },
          "recalls.RecallID": { $in: uniq },
        },
      },
      {
        $project: {
          categorySlug: 1,
          matchingIds: {
            $setIntersection: [
              uniq,
              {
                $map: { input: "$recalls", as: "r", in: "$$r.RecallID" },
              },
            ],
          },
        },
      },
    ])
    .toArray();

  const out = [];
  const seen = new Set();
  for (const doc of rows) {
    const slug = doc.categorySlug;
    for (const id of doc.matchingIds || []) {
      if (id == null || !Number.isFinite(Number(id))) continue;
      const n = Number(id);
      const key = `${n}\0${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ recallId: n, otherCategory: slug });
    }
  }
  return out;
}

function barStr(pct, width = 28) {
  const p = Math.max(0, Math.min(100, pct));
  const filled = Math.round((p / 100) * width);
  const a = "█".repeat(filled);
  const b = "░".repeat(width - filled);
  return `${t.cyan}${a}${t.gray}${b}${t.reset}`;
}

function printHeader({ dryRun, total, verbose }) {
  const mode = dryRun ? `${t.yellow}dry-run${t.reset}` : `${t.green}write${t.reset}`;
  const line = "─".repeat(56);
  console.log(`${t.dim}${line}${t.reset}`);
  console.log(`  ${t.bold}General recalls → MongoDB${t.reset}  ${t.dim}${DB_NAME}.${COLLECTION}${t.reset}`);
  console.log(`  Mode: ${mode}  ·  Files: ${t.bold}${total}${t.reset}${verbose ? `  ${t.dim}(verbose)${t.reset}` : ""}`);
  console.log(`${t.dim}${line}${t.reset}\n`);
}

function printProgressTTY({ current, total, slug, recallCount, dryRun }) {
  const pct = total ? Math.min(100, Math.floor((100 * current) / total)) : 100;
  const tag = dryRun ? `${t.dim}preview${t.reset}` : `${t.dim}sync${t.reset}`;
  const line =
    `${barStr(pct)} ${t.bold}${current}${t.reset}/${total} ${t.dim}(${pct}%)${t.reset} ` +
    `${t.cyan}${slug}${t.reset} ${t.dim}·${t.reset} ${recallCount} recalls  ${tag}`;
  process.stdout.write(`\r\x1b[K${line}`);
}

function printFooter({
  dryRun,
  filesLen,
  upserted,
  modified,
  skippedUnchanged,
  inFileDupesDropped,
  crossCategoryOverlaps,
  collTotal,
  errors,
  elapsedSec,
}) {
  const line = "─".repeat(56);
  console.log(`\n${t.dim}${line}${t.reset}`);
  console.log(`  ${t.bold}Done${t.reset} ${t.dim}in ${elapsedSec}s${t.reset}`);
  console.log(`  Files processed: ${t.bold}${filesLen}${t.reset}`);
  if (!dryRun) {
    console.log(
      `  ${t.green}New${t.reset}: ${upserted}  ·  ${t.cyan}Updated${t.reset}: ${modified}  ·  ${t.yellow}Skipped (unchanged)${t.reset}: ${skippedUnchanged}`
    );
    console.log(`  ${t.dim}docs in collection: ${collTotal}${t.reset}`);
  } else {
    console.log(`  ${t.yellow}Would skip (unchanged)${t.reset}: ${skippedUnchanged}  ${t.dim}(hash match)${t.reset}`);
    console.log(`  ${t.dim}(no database writes)${t.reset}`);
  }
  if (inFileDupesDropped > 0) {
    console.log(`  ${t.yellow}In-file duplicate rows dropped:${t.reset} ${inFileDupesDropped}`);
  }
  if (crossCategoryOverlaps > 0) {
    console.log(
      `  ${t.yellow}Cross-category recall ID overlaps (warn):${t.reset} ${crossCategoryOverlaps}  ${t.dim}(same RecallID in another category doc)${t.reset}`
    );
  }
  if (errors.length) {
    console.log(`  ${t.red}Errors: ${errors.length}${t.reset}`);
  }
  console.log(`${t.dim}${line}${t.reset}`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");
  const isTTY = process.stdout.isTTY;
  const t0 = Date.now();

  const files = listJsonFiles(TRANSLATED_JSON_DIR).sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.error(`${t.red}No JSON files in${t.reset} ${TRANSLATED_JSON_DIR}`);
    process.exit(1);
  }

  printHeader({ dryRun, total: files.length, verbose });

  const db = await getDb();
  const coll = db.collection(COLLECTION);

  if (!dryRun) {
    await coll.createIndex({ categorySlug: 1 }, { unique: true, name: "categorySlug_unique" });
    await coll.createIndex({ "recalls.RecallID": 1 }, { name: "general_recalls_RecallID_multikey" });
  }

  let upserted = 0;
  let modified = 0;
  let skippedUnchanged = 0;
  let inFileDupesDropped = 0;
  let crossCategoryOverlapRows = 0;
  const crossCategoryDetails = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const num = i + 1;
    let raw;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (e) {
      errors.push({ file: relForDoc(filePath), step: "read", error: String(e.message) });
      if (verbose) console.log(`${t.red}✗${t.reset} read ${relForDoc(filePath)}`);
      else if (isTTY) printProgressTTY({ current: num, total: files.length, slug: "(error)", recallCount: "—", dryRun });
      continue;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      errors.push({ file: relForDoc(filePath), step: "parse", error: String(e.message) });
      if (verbose) console.log(`${t.red}✗${t.reset} parse ${relForDoc(filePath)}`);
      else if (isTTY) printProgressTTY({ current: num, total: files.length, slug: "(parse error)", recallCount: "—", dryRun });
      continue;
    }

    const baseSlug = path.basename(filePath, ".json");
    const categorySlug = String(data?.meta?.slug ?? baseSlug).trim() || baseSlug;
    const rel = relForDoc(filePath);

    const rawList = Array.isArray(data.recalls) ? data.recalls : [];
    const { recalls, dropped: droppedInFile } = dedupeRecalls(rawList);
    inFileDupesDropped += droppedInFile;

    const meta = { ...(data.meta ?? {}), recallCount: recalls.length };
    const hash = payloadHash(meta, recalls);
    const recallIds = numericRecallIds(recalls);

    const existing = await coll.findOne(
      { categorySlug },
      { projection: { createdAt: 1, payloadHash: 1 } }
    );

    if (existing?.payloadHash === hash) {
      skippedUnchanged += 1;
      if (verbose) {
        console.log(
          `${t.dim}${String(num).padStart(3)}/${files.length}${t.reset} ${t.yellow}≡ skip${t.reset} ${categorySlug} ${t.dim}(unchanged)${t.reset}`
        );
      } else if (isTTY) {
        printProgressTTY({
          current: num,
          total: files.length,
          slug: `${categorySlug} ≡`,
          recallCount: recalls.length,
          dryRun,
        });
      } else if (num === 1 || num === files.length || num % 40 === 0) {
        console.log(`[${num}/${files.length}] ${categorySlug} (unchanged)`);
      }
      continue;
    }

    const overlaps = await findCrossCategoryOverlaps(coll, categorySlug, recallIds);
    crossCategoryOverlapRows += overlaps.length;
    if (overlaps.length && verbose) {
      for (const o of overlaps) {
        console.log(
          `${t.yellow}⚠${t.reset} RecallID ${o.recallId} also in category ${t.cyan}${o.otherCategory}${t.reset} (${categorySlug})`
        );
      }
    }
    if (overlaps.length) {
      crossCategoryDetails.push(...overlaps.map((o) => ({ ...o, categorySlug })));
    }

    const now = new Date().toISOString();
    const doc = {
      categorySlug,
      sourceRelativePath: rel,
      meta,
      recalls,
      payloadHash: hash,
      updatedAt: now,
    };

    if (dryRun) {
      if (verbose) {
        console.log(
          `${t.dim}${String(num).padStart(3)}/${files.length}${t.reset} ${t.green}○${t.reset} ${categorySlug} ${t.dim}·${t.reset} ${recalls.length} recalls` +
            (droppedInFile ? ` ${t.yellow}(-${droppedInFile} dupes)${t.reset}` : "")
        );
      } else if (isTTY) {
        printProgressTTY({
          current: num,
          total: files.length,
          slug: categorySlug,
          recallCount: recalls.length,
          dryRun: true,
        });
      } else if (num === 1 || num === files.length || num % 40 === 0) {
        console.log(`[${num}/${files.length}] ${categorySlug} (${recalls.length} recalls)`);
      }
      continue;
    }

    if (!existing?.createdAt) {
      doc.createdAt = now;
    } else {
      doc.createdAt = existing.createdAt;
    }

    try {
      const r = await coll.updateOne({ categorySlug }, { $set: doc }, { upsert: true });
      if (r.upsertedCount) upserted += 1;
      else if (r.modifiedCount) modified += 1;

      if (verbose) {
        const tag = r.upsertedCount ? `${t.green}+insert${t.reset}` : `${t.cyan}~update${t.reset}`;
        console.log(
          `${t.dim}${String(num).padStart(3)}/${files.length}${t.reset} ${tag} ${categorySlug} ${t.dim}·${t.reset} ${recalls.length} recalls` +
            (droppedInFile ? ` ${t.yellow}(-${droppedInFile} dupes)${t.reset}` : "")
        );
      } else if (isTTY) {
        printProgressTTY({
          current: num,
          total: files.length,
          slug: categorySlug,
          recallCount: recalls.length,
          dryRun: false,
        });
      } else if (num === 1 || num === files.length || num % 40 === 0) {
        console.log(`[${num}/${files.length}] ${categorySlug} (${recalls.length} recalls)`);
      }
    } catch (e) {
      errors.push({ file: rel, categorySlug, step: "upsert", error: String(e.message) });
      if (verbose) console.log(`${t.red}✗${t.reset} ${categorySlug}: ${e.message}`);
      else if (isTTY) printProgressTTY({ current: num, total: files.length, slug: `${categorySlug} (err)`, recallCount: "—", dryRun });
    }
  }

  if (isTTY && !verbose) {
    process.stdout.write("\n");
  }

  const collTotal = dryRun ? 0 : await coll.countDocuments();
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

  printFooter({
    dryRun,
    filesLen: files.length,
    upserted,
    modified,
    skippedUnchanged,
    inFileDupesDropped,
    crossCategoryOverlaps: crossCategoryOverlapRows,
    collTotal,
    errors,
    elapsedSec,
  });

  if (crossCategoryDetails.length && !verbose) {
    const sample = crossCategoryDetails.slice(0, 15);
    console.log(`\n${t.yellow}Cross-category overlap sample (use --verbose for per-file):${t.reset}`);
    for (const row of sample) {
      console.log(
        `  RecallID ${row.recallId} → ${row.categorySlug} ${t.dim}also in${t.reset} ${row.otherCategory}`
      );
    }
    if (crossCategoryDetails.length > sample.length) {
      console.log(`  ${t.dim}… and ${crossCategoryDetails.length - sample.length} more${t.reset}`);
    }
  }

  if (errors.length) {
    console.error(`${t.red}${t.bold}Error detail:${t.reset}`);
    console.error(JSON.stringify(errors, null, 2));
    process.exitCode = 1;
  }

  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
