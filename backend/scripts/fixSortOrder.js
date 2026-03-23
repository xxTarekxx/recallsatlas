/**
 * fixSortOrder.js
 *
 * Re-assigns sortOrder to ALL recalls in recalls.json
 * by sorting them chronologically (oldest → newest = 1 → N).
 *
 * Also:
 *  - Renames image folders on disk from oldSortOrder-slug/ to newSortOrder-slug/
 *  - Updates image paths inside each recall document
 *  - Updates MongoDB
 *
 * Run from backend/:
 *   node scripts/fixSortOrder.js          # preview changes
 *   node scripts/fixSortOrder.js --apply  # write everything
 */

const path = require("path");
const fs   = require("fs");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const JSON_PATH = path.join(__dirname, "recalls.json");
const APPLY     = process.argv.includes("--apply");

const IMAGE_BASE_DIR =
  process.env.IMAGE_BASE_DIR ||
  path.resolve(__dirname, "..", "..", "frontend", "public", "images", "recalls");

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDate(recall) {
  return (
    recall.fdaPublishDateTime        ||
    recall.fdaPublishDate            ||
    recall.companyAnnouncementDateTime ||
    recall.datePublished             ||
    ""
  );
}

/** Extract the folder name from the first image path, e.g. "239-slug-name" */
function getFolderName(recall) {
  const firstPath =
    recall.images?.[0] ||
    (typeof recall.image === "object" ? recall.image?.url : recall.image) ||
    "";
  if (!firstPath) return null;
  const m = firstPath.match(/\/images\/recalls\/([^/]+)\//);
  return m ? m[1] : null;
}

/** Replace old folder prefix with new one in all image path fields */
function updateImagePaths(recall, oldFolder, newFolder) {
  const replace = (p) =>
    typeof p === "string"
      ? p.replace(`/images/recalls/${oldFolder}/`, `/images/recalls/${newFolder}/`)
      : p;

  if (Array.isArray(recall.images)) {
    recall.images = recall.images.map(replace);
  }
  if (typeof recall.image === "string") {
    recall.image = replace(recall.image);
  }
  if (recall.image && typeof recall.image === "object" && recall.image.url) {
    recall.image = { ...recall.image, url: replace(recall.image.url) };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const raw     = fs.readFileSync(JSON_PATH, "utf8");
  const recalls = JSON.parse(raw);

  console.log(`\nLoaded ${recalls.length} recalls`);
  console.log(`Image dir: ${IMAGE_BASE_DIR}\n`);

  // Sort oldest → newest, slug as tiebreaker for same-date stability
  const sorted = [...recalls].sort((a, b) => {
    const da = getDate(a);
    const db = getDate(b);
    if (da < db) return -1;
    if (da > db) return  1;
    const sa = a.id || a.slug || "";
    const sb = b.id || b.slug || "";
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });

  // Build change list
  const changes = [];
  sorted.forEach((recall, i) => {
    const newOrder  = i + 1;
    const oldOrder  = recall.sortOrder;
    const slug      = recall.id || recall.slug || "";
    const oldFolder = getFolderName(recall);               // e.g. "239-slug"
    const newFolder = oldFolder
      ? oldFolder.replace(/^\d+(-|$)/, `${newOrder}$1`)   // swap leading number
      : null;

    if (oldOrder !== newOrder || (oldFolder && oldFolder !== newFolder)) {
      changes.push({ slug, oldOrder, newOrder, oldFolder, newFolder });
    }

    recall.sortOrder = newOrder;

    // Update image paths in the recall object (in memory)
    if (oldFolder && newFolder && oldFolder !== newFolder) {
      updateImagePaths(recall, oldFolder, newFolder);
    }
  });

  // Preview
  console.log(`Changes needed: ${changes.length}`);
  changes.forEach(c => {
    const orderStr = `${String(c.oldOrder).padStart(4)} → ${String(c.newOrder).padStart(4)}`;
    const folderStr = c.oldFolder && c.oldFolder !== c.newFolder
      ? `  [folder: ${c.oldFolder} → ${c.newFolder}]`
      : "";
    console.log(`  ${orderStr}  ${c.slug}${folderStr}`);
  });

  if (!APPLY) {
    console.log("\nDry run — pass --apply to write changes.\n");
    return;
  }

  // ── Rename image folders on disk ───────────────────────────────────────────
  let renamedFolders = 0;
  let missingFolders = 0;

  for (const c of changes) {
    if (!c.oldFolder || !c.newFolder || c.oldFolder === c.newFolder) continue;

    const oldPath = path.join(IMAGE_BASE_DIR, c.oldFolder);
    const newPath = path.join(IMAGE_BASE_DIR, c.newFolder);

    if (!fs.existsSync(oldPath)) {
      missingFolders++;
      continue; // no images for this recall — nothing to rename
    }
    if (fs.existsSync(newPath)) {
      console.log(`  Skip rename (target exists): ${c.newFolder}`);
      continue;
    }

    try {
      fs.renameSync(oldPath, newPath);
      renamedFolders++;
      console.log(`  Renamed: ${c.oldFolder} → ${c.newFolder}`);
    } catch (err) {
      if (err.code === "EBUSY") {
        console.error(`  EBUSY (folder locked): ${c.oldFolder}`);
        console.error(`  → Stop the Next.js dev server and run again.`);
        process.exit(1);
      }
      throw err;
    }
  }

  console.log(`\nFolders renamed: ${renamedFolders}  (${missingFolders} had no images)`);

  // ── Save JSON ──────────────────────────────────────────────────────────────
  const newestFirst = [...sorted].reverse();
  fs.writeFileSync(JSON_PATH, JSON.stringify(newestFirst, null, 2));
  console.log("recalls.json updated.");

  // ── Update MongoDB ─────────────────────────────────────────────────────────
  const { getDb, close } = require("../database/mongodb");
  const db   = await getDb();
  const coll = db.collection("recalls");

  let mongoUpdated = 0;
  for (const recall of sorted) {
    const slug = recall.id || recall.slug;
    if (!slug) continue;
    await coll.updateOne(
      { slug },
      { $set: {
          sortOrder: recall.sortOrder,
          image:     recall.image,
          images:    recall.images,
        }
      }
    );
    mongoUpdated++;
  }

  await close();
  console.log(`MongoDB updated: ${mongoUpdated} documents.\n`);
  console.log("Done. Run without --apply to verify 0 changes remain.\n");
}

main().catch(err => { console.error(err); process.exit(1); });
