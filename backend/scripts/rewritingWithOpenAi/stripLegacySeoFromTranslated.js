/**
 * One-off / maintenance: remove legacy `seo` objects from generalRecallsTranslated/*.json.
 * Next.js uses dynamic metadata from Title, Description, slug, metaDescription, Images.
 *
 * For recalls that only had `seo.slug` / `seo.metaDescription`, promotes them to top-level
 * `slug` and `metaDescription` before deleting `seo`.
 *
 * Does NOT change RecallDate / LastPublishDate (CPSC source fields).
 *
 * From backend/:  npm run strip-legacy-general-recall-seo
 * Dry run:       npm run strip-legacy-general-recall-seo:dry-run
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "..", "generalRecalls", "generalRecallsTranslated");

function promoteAndStrip(recall) {
  if (!recall || typeof recall !== "object" || !recall.seo || typeof recall.seo !== "object") {
    return false;
  }
  const seo = recall.seo;
  if (typeof recall.slug !== "string" || !recall.slug.trim()) {
    const s = typeof seo.slug === "string" ? seo.slug.trim() : "";
    if (s) recall.slug = s;
  }
  if (typeof recall.metaDescription !== "string" || !recall.metaDescription.trim()) {
    const m = typeof seo.metaDescription === "string" ? seo.metaDescription.trim().slice(0, 160) : "";
    if (m) recall.metaDescription = m;
  }
  delete recall.seo;
  return true;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!fs.existsSync(OUT_DIR)) {
    console.error("Missing", OUT_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(OUT_DIR).filter((n) => n.endsWith(".json") && n !== "imageUrlMap.json").sort();
  let filesTouched = 0;
  let recallsStripped = 0;
  let recallsPromotedSlug = 0;
  let recallsPromotedMeta = 0;

  for (const fileName of files) {
    const outPath = path.join(OUT_DIR, fileName);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(outPath, "utf8"));
    } catch (e) {
      console.warn("Skip corrupt:", fileName, e.message);
      continue;
    }
    const recalls = raw.recalls || [];
    let fileChanged = false;

    for (const r of recalls) {
      if (!r.seo) continue;
      const hadSlug = Boolean(typeof r.slug === "string" && r.slug.trim());
      const hadMeta = Boolean(typeof r.metaDescription === "string" && r.metaDescription.trim());
      if (dryRun) {
        recallsStripped++;
        if (!hadSlug && r.seo.slug) recallsPromotedSlug++;
        if (!hadMeta && r.seo.metaDescription) recallsPromotedMeta++;
        fileChanged = true;
        continue;
      }
      if (promoteAndStrip(r)) {
        recallsStripped++;
        if (!hadSlug && r.slug) recallsPromotedSlug++;
        if (!hadMeta && r.metaDescription) recallsPromotedMeta++;
        fileChanged = true;
      }
    }

    if (fileChanged && !dryRun) {
      fs.writeFileSync(outPath, JSON.stringify(raw, null, 2), "utf8");
      filesTouched++;
    } else if (fileChanged && dryRun) {
      filesTouched++;
    }
  }

  console.log(
    dryRun
      ? `[dry-run] Would touch ${filesTouched} file(s), ${recallsStripped} recall(s) with seo stripped (slug promotions ~${recallsPromotedSlug}, meta ~${recallsPromotedMeta}).`
      : `Done. Updated ${filesTouched} file(s); stripped seo on ${recallsStripped} recall(s); promoted slug on ${recallsPromotedSlug}, metaDescription on ${recallsPromotedMeta}.`
  );
}

main();
