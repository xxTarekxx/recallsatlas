"use strict";

const fs = require("fs");
const path = require("path");

const BACKEND_ROOT = path.join(__dirname, "..", "..");
const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");

const MIN_FDA_RECALLS = Number.parseInt(process.env.MIN_FDA_RECALLS || "0", 10);
const MIN_GENERAL_RECALLS = Number.parseInt(process.env.MIN_GENERAL_RECALLS || "0", 10);
const MIN_TOTAL_RECALLS = Number.parseInt(process.env.MIN_TOTAL_RECALLS || "0", 10);
const MIN_FDA_VISIBLE_WORDS = Number.parseInt(process.env.MIN_FDA_VISIBLE_WORDS || "250", 10);
const MIN_GENERAL_VISIBLE_WORDS = Number.parseInt(process.env.MIN_GENERAL_VISIBLE_WORDS || "300", 10);
const MAX_FDA_VISIBLE_WORDS = Number.parseInt(process.env.MAX_FDA_VISIBLE_WORDS || "900", 10);
const MAX_GENERAL_VISIBLE_WORDS = Number.parseInt(process.env.MAX_GENERAL_VISIBLE_WORDS || "700", 10);
const REQUIRE_LOCAL_IMAGES = /^(1|true|yes)$/i.test(String(process.env.REQUIRE_LOCAL_IMAGES || ""));

const FILES = {
  fda: path.join(BACKEND_ROOT, "fdaRecalls", "data", "fda-recalls-en-eeat.json"),
  general: path.join(BACKEND_ROOT, "generalRecalls", "data", "general-recalls-en-eeat.json"),
  cars: path.join(BACKEND_ROOT, "carsRecalls", "data", "cars.json"),
  adsTxt: path.join(REPO_ROOT, "frontend", "public", "ads.txt"),
};

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

function countWithKey(rows, key) {
  return rows.filter((row) => typeof row?.[key] === "string" && row[key].trim()).length;
}

function stripText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectVisibleText(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string") {
    const text = stripText(value);
    if (text) out.push(text);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectVisibleText(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (
        [
          "@context",
          "@type",
          "_contentHash",
          "author",
          "canonicalUrl",
          "href",
          "id",
          "image",
          "keywords",
          "languages",
          "mainEntityOfPage",
          "publisher",
          "rawImageSources",
          "slug",
          "sourceUrl",
          "url",
          "URL",
        ].includes(key)
      ) {
        continue;
      }
      collectVisibleText(item, out);
    }
  }
  return out;
}

function visibleWordCount(row) {
  const text = [
    row.title,
    row.Title,
    row.headline,
    row.description,
    row.Description,
    row.subtitle,
    row.content,
    row.Products,
    row.Hazards,
    row.Remedies,
    row.RemedyOptions,
    row.Injuries,
    row.Retailers,
    row.Importers,
    row.Distributors,
    row.Manufacturers,
    row.ManufacturerCountries,
    row.ConsumerContact,
  ]
    .flatMap((item) => collectVisibleText(item))
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

function wordStats(rows, minWords) {
  const counts = rows
    .map((row) => ({
      slug: row.slug || row.campaignNumber || "(missing slug)",
      words: visibleWordCount(row),
    }))
    .sort((a, b) => a.words - b.words);
  const total = counts.reduce((sum, row) => sum + row.words, 0);
  return {
    average: counts.length ? Math.round(total / counts.length) : 0,
    min: counts[0]?.words || 0,
    max: counts[counts.length - 1]?.words || 0,
    belowMin: counts.filter((row) => row.words < minWords),
    counts,
  };
}

function collectImageUrls(row) {
  const urls = [];
  if (typeof row.image === "string" && row.image.trim()) urls.push(row.image.trim());
  if (row.image && typeof row.image === "object" && typeof row.image.url === "string") {
    urls.push(row.image.url.trim());
  }
  if (Array.isArray(row.images)) {
    for (const image of row.images) {
      if (typeof image === "string" && image.trim()) urls.push(image.trim());
      if (image && typeof image === "object" && typeof image.url === "string") {
        urls.push(image.url.trim());
      }
    }
  }
  if (Array.isArray(row.Images)) {
    for (const image of row.Images) {
      if (typeof image?.URL === "string" && image.URL.trim()) urls.push(image.URL.trim());
    }
  }
  return Array.from(new Set(urls));
}

function localImageStats(rows) {
  const missing = [];
  const noLocalImage = [];
  for (const row of rows) {
    const slug = row.slug || row.id || row.campaignNumber || "(missing slug)";
    const localUrls = collectImageUrls(row).filter((url) => url.startsWith("/images/"));
    if (!localUrls.length) {
      noLocalImage.push(slug);
      continue;
    }
    for (const url of localUrls) {
      const filePath = path.join(REPO_ROOT, "frontend", "public", url.replace(/^\//, ""));
      if (!fs.existsSync(filePath)) missing.push(`${slug}: ${url}`);
    }
  }
  return { missing, noLocalImage };
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  const fdaRows = readJsonArray(FILES.fda);
  const generalRows = readJsonArray(FILES.general);
  const fdaCount = countWithKey(fdaRows, "slug");
  const generalCount = countWithKey(generalRows, "slug");
  const vehicleCount = countWithKey(readJsonArray(FILES.cars), "campaignNumber");
  const total = fdaCount + generalCount + vehicleCount;
  const fdaWords = wordStats(fdaRows, MIN_FDA_VISIBLE_WORDS);
  const generalWords = wordStats(generalRows, MIN_GENERAL_VISIBLE_WORDS);
  const fdaImages = localImageStats(fdaRows);
  const generalImages = localImageStats(generalRows);

  assert(fdaCount >= MIN_FDA_RECALLS, `FDA recall pages are too low: ${fdaCount} < ${MIN_FDA_RECALLS}`, failures);
  assert(
    generalCount >= MIN_GENERAL_RECALLS,
    `CPSC/general recall pages are too low: ${generalCount} < ${MIN_GENERAL_RECALLS}`,
    failures
  );
  assert(total >= MIN_TOTAL_RECALLS, `Total recall pages are too low: ${total} < ${MIN_TOTAL_RECALLS}`, failures);
  assert(
    fdaWords.belowMin.length === 0,
    `FDA recall pages below ${MIN_FDA_VISIBLE_WORDS} visible words: ${fdaWords.belowMin.length}`,
    failures
  );
  assert(
    generalWords.belowMin.length === 0,
    `CPSC/general recall pages below ${MIN_GENERAL_VISIBLE_WORDS} visible words: ${generalWords.belowMin.length}`,
    failures
  );
  const fdaAboveMax = fdaWords.counts.filter((row) => row.words > MAX_FDA_VISIBLE_WORDS);
  const generalAboveMax = generalWords.counts.filter((row) => row.words > MAX_GENERAL_VISIBLE_WORDS);
  assert(
    fdaAboveMax.length === 0,
    `FDA recall pages above ${MAX_FDA_VISIBLE_WORDS} visible words: ${fdaAboveMax.length}`,
    failures
  );
  assert(
    generalAboveMax.length === 0,
    `CPSC/general recall pages above ${MAX_GENERAL_VISIBLE_WORDS} visible words: ${generalAboveMax.length}`,
    failures
  );
  if (REQUIRE_LOCAL_IMAGES) {
    assert(fdaImages.noLocalImage.length === 0, `FDA pages without local images: ${fdaImages.noLocalImage.length}`, failures);
    assert(generalImages.noLocalImage.length === 0, `CPSC/general pages without local images: ${generalImages.noLocalImage.length}`, failures);
  }
  assert(fdaImages.missing.length === 0, `FDA pages with missing local image files: ${fdaImages.missing.length}`, failures);
  assert(
    generalImages.missing.length === 0,
    `CPSC/general pages with missing local image files: ${generalImages.missing.length}`,
    failures
  );
  assert(fs.existsSync(FILES.adsTxt), "frontend/public/ads.txt is missing", failures);

  console.log("Compact recall content audit");
  console.log(`FDA recall pages     : ${fdaCount}`);
  console.log(`CPSC recall pages    : ${generalCount}`);
  console.log(`Vehicle recall pages : ${vehicleCount}`);
  console.log(`Total detail pages   : ${total}`);
  console.log(`FDA visible words    : min ${fdaWords.min}, avg ${fdaWords.average}, max ${fdaWords.max}`);
  console.log(`CPSC visible words   : min ${generalWords.min}, avg ${generalWords.average}, max ${generalWords.max}`);
  console.log(`Require local images : ${REQUIRE_LOCAL_IMAGES ? "yes" : "no"}`);
  console.log(`FDA local images     : ${fdaImages.missing.length ? "missing files" : "ok"}`);
  console.log(`CPSC local images    : ${generalImages.missing.length ? "missing files" : "ok"}`);

  if (failures.length) {
    console.error("");
    console.error("Recall content audit failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Compact recall content passes configured thresholds.");
}

main();
