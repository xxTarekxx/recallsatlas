/**
 * One-off: move WebP files from flat layout
 *   public/images/generalRecalls/<category>/<hash>.webp
 * to per-recall folders
 *   public/images/generalRecalls/<category>/<index>-<slugified-product>/<hash>.webp
 * and update URLs in generalRecallsTranslated/*.json plus imageUrlMap.json keys.
 *
 * Dry run: node scripts/rewritingWithOpenAi/migrateGeneralRecallImageLayout.js --dry-run
 * Apply:   node scripts/rewritingWithOpenAi/migrateGeneralRecallImageLayout.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const REPO_ROOT = path.join(ROOT, "..", "..", "..");
const OUT_DIR = path.join(ROOT, "..", "generalRecalls", "generalRecallsTranslated");
const MAP_PATH = path.join(OUT_DIR, "imageUrlMap.json");
const IMG_DIR = path.join(REPO_ROOT, "frontend", "public", "images", "generalRecalls");

function safeImageFolderSlug(s) {
  const t = String(s || "misc")
    .replace(/[^a-z0-9-_]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return t || "misc";
}

function recallImageSubfolder(index1Based, recall) {
  const raw = (recall.Products && recall.Products[0] && recall.Products[0].Name) || "product";
  const part = safeImageFolderSlug(raw);
  return `${index1Based}-${part || "product"}`;
}

/** /images/generalRecalls/<cat>/<32hex>.webp */
const FLAT_PUBLIC_RE = /^\/images\/generalRecalls\/([^/]+)\/([a-f0-9]{32}\.webp)$/i;

function loadMap() {
  if (!fs.existsSync(MAP_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveMap(map) {
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), "utf8");
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!fs.existsSync(OUT_DIR)) {
    console.error("Missing", OUT_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(OUT_DIR).filter((n) => n.endsWith(".json") && n !== "imageUrlMap.json").sort();
  const imageMap = loadMap();
  let moves = 0;
  let jsonUpdates = 0;

  for (const fileName of files) {
    const outPath = path.join(OUT_DIR, fileName);
    const raw = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const meta = raw.meta || {};
    const categorySlug = safeImageFolderSlug(meta.slug || path.basename(fileName, ".json"));
    const recalls = raw.recalls || [];
    let fileTouched = false;

    for (let i = 0; i < recalls.length; i++) {
      const recall = recalls[i];
      const relFolder = recallImageSubfolder(i + 1, recall);
      const images = recall.Images || [];

      for (const img of images) {
        const u = String(img.URL || "").trim();
        const m = u.match(FLAT_PUBLIC_RE);
        if (!m) continue;
        const cat = m[1];
        const webpName = m[2];
        if (cat !== categorySlug) {
          console.warn(`Category mismatch ${fileName} recall ${recall.RecallNumber}: URL cat ${cat} vs meta ${categorySlug}`);
        }

        const srcAbs = path.join(IMG_DIR, cat, webpName);
        const destDir = path.join(IMG_DIR, cat, relFolder);
        const destAbs = path.join(destDir, webpName);
        const newPublic = `/images/generalRecalls/${cat}/${relFolder}/${webpName}`;
        const sourceUrl = String(img.SourceImageURL || "").trim();

        if (!fs.existsSync(srcAbs)) {
          console.warn(`Missing file (skip): ${srcAbs}`);
          continue;
        }

        if (dryRun) {
          console.log(`[dry-run] ${u} -> ${newPublic}`);
          moves++;
          continue;
        }

        fs.mkdirSync(destDir, { recursive: true });
        if (!fs.existsSync(destAbs)) {
          fs.renameSync(srcAbs, destAbs);
        }
        img.URL = newPublic;
        fileTouched = true;
        jsonUpdates++;
        moves++;

        const newRel = `${cat}/${relFolder}`;
        for (const key of [...Object.keys(imageMap)]) {
          const ent = imageMap[key];
          if (!ent || typeof ent !== "object") continue;
          const matchPath = ent.publicPath === u;
          const matchSource =
            sourceUrl &&
            ent.sourceUrl === sourceUrl &&
            FLAT_PUBLIC_RE.test(String(ent.publicPath || ""));
          if (matchPath || matchSource) {
            delete imageMap[key];
            const srcKey = ent.sourceUrl || sourceUrl;
            const newKey = `${newRel}::${srcKey}`;
            imageMap[newKey] = {
              ...ent,
              folder: newRel,
              fileName: webpName,
              publicPath: newPublic,
              absoluteUrl: `https://www.recallsatlas.com${newPublic}`,
            };
            break;
          }
        }
      }
    }

    if (fileTouched && !dryRun) {
      fs.writeFileSync(outPath, JSON.stringify({ ...raw, recalls }, null, 2), "utf8");
      saveMap(imageMap);
      console.log("Updated", fileName);
    }
  }

  if (dryRun) {
    console.log(`\nDry run: ${moves} image path(s) would change. Run without --dry-run to apply.`);
  } else {
    console.log(`\nDone. Moves/URL updates: ${moves}, JSON rows touched: ${jsonUpdates}`);
  }
}

main();
