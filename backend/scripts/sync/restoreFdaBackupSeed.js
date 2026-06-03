"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BACKEND_ROOT = path.join(__dirname, "..", "..");
const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const BACKUP_PATH = path.join(BACKEND_ROOT, "scripts", "do-not-delete(backups).json");
const FDA_PATH = path.join(BACKEND_ROOT, "fdaRecalls", "data", "fda-recalls-en-eeat.json");
const IMAGE_MAP_PATH = path.join(BACKEND_ROOT, "fdaRecalls", "data", "image-map.json");
const HASH_PATH = path.join(BACKEND_ROOT, "fdaRecalls", "data", "logs", "fda-recalls-en-eeat.hashes.json");

const DROP_SECTIONS = new Set([
  "about the company",
  "company contact information",
  "official source",
  "reason for recall",
]);
const KEEP_LANGS = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"];

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeUrl(value) {
  const raw = cleanText(value);
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

function sourceKey(row) {
  return normalizeUrl(row.sourceUrl || row.source_url) || cleanText(row.slug || row.id);
}

function score(row) {
  let out = 0;
  if (cleanText(row.slug)) out += 5;
  if (cleanText(row.sourceUrl)) out += 5;
  if (cleanText(row.productDescription)) out += 4;
  if (cleanText(row.reason)) out += 4;
  if (cleanText(row.fdaPublishDate || row.fdaPublishDateTime || row.datePublished)) out += 3;
  if (Array.isArray(row.content) && row.content.length) out += 8;
  if (row.languages && typeof row.languages === "object") out += Object.keys(row.languages).length;
  if (Array.isArray(row.rawImageSources) && row.rawImageSources.length) out += 2;
  return out;
}

function isUsable(row) {
  return Boolean(
    cleanText(row.slug) &&
      cleanText(row.sourceUrl) &&
      cleanText(row.title || row.headline) &&
      cleanText(row.productDescription) &&
      cleanText(row.reason) &&
      cleanText(row.fdaPublishDate || row.fdaPublishDateTime || row.datePublished) &&
      Array.isArray(row.content) &&
      row.content.length
  );
}

function compactSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter((section) => section && typeof section === "object")
    .filter((section) => !DROP_SECTIONS.has(cleanText(section.subtitle).toLowerCase()))
    .map((section) => {
      const next = { ...section };
      delete next.authorityLinks;
      return next;
    })
    .filter((section) => section.text || section.facts || section.faq);
}

function localImageExists(url) {
  if (!String(url || "").startsWith("/images/")) return false;
  const filePath = path.join(REPO_ROOT, "frontend", "public", String(url).replace(/^\//, ""));
  return fs.existsSync(filePath);
}

function collectRawImageSources(row) {
  const out = [];
  const add = (value) => {
    const s = cleanText(value);
    if (s && /^https?:\/\//i.test(s)) out.push(s);
  };

  if (Array.isArray(row.rawImageSources)) {
    for (const value of row.rawImageSources) add(value);
  }

  if (Array.isArray(row.images)) {
    for (const image of row.images) {
      if (typeof image === "string") add(image);
      else {
        add(image?.SourceImageURL);
        add(image?.sourceUrl);
        add(image?.originalUrl);
        add(image?.url);
        add(image?.URL);
      }
    }
  }

  return [...new Set(out)];
}

function cleanImages(row) {
  const rawImageSources = collectRawImageSources(row);
  const localImages = Array.isArray(row.images)
    ? row.images.filter((image) => {
        const url = typeof image === "string" ? image : image?.url || image?.URL;
        return localImageExists(url);
      })
    : [];

  if (localImages.length) row.images = localImages;
  else delete row.images;

  const imageUrl = typeof row.image === "string" ? row.image : row.image?.url;
  if (!localImageExists(imageUrl)) delete row.image;

  row.rawImageSources = rawImageSources;
}

function cleanLanguages(languages) {
  if (!languages || typeof languages !== "object") return {};
  const out = {};
  for (const lang of KEEP_LANGS) {
    if (!languages[lang] || typeof languages[lang] !== "object") continue;
    out[lang] = {
      ...languages[lang],
      content: compactSections(languages[lang].content),
    };
    if (Array.isArray(out[lang].Images)) {
      out[lang].Images = out[lang].Images.map((image) => ({ Caption: cleanText(image?.Caption || image?.caption) })).filter(
        (image) => image.Caption
      );
    }
  }
  return out;
}

function hashRecord(row) {
  return crypto.createHash("sha256").update(sourceKey(row) || JSON.stringify(row)).digest("hex");
}

function normalizeRow(row) {
  const next = JSON.parse(JSON.stringify(row));
  next.sourceUrl = normalizeUrl(next.sourceUrl || next.source_url);
  delete next.source_url;
  next.content = compactSections(next.content);
  next.languages = cleanLanguages(next.languages);
  cleanImages(next);
  next.backupSeedVersion = "fda-backup-compact-v1";
  next.dateModified = new Date().toISOString().slice(0, 10);
  return next;
}

function sortRows(rows) {
  return rows.sort((a, b) => {
    const as = typeof a.sortOrder === "number" ? a.sortOrder : 0;
    const bs = typeof b.sortOrder === "number" ? b.sortOrder : 0;
    if (as !== bs) return bs - as;
    return String(b.fdaPublishDateTime || b.datePublished || "").localeCompare(String(a.fdaPublishDateTime || a.datePublished || ""));
  });
}

function main() {
  const backup = readJson(BACKUP_PATH, []);
  if (!Array.isArray(backup)) throw new Error(`${BACKUP_PATH} must contain a JSON array`);

  const bySource = new Map();
  let duplicateCount = 0;
  for (const row of backup) {
    const key = sourceKey(row);
    if (!key) continue;
    const current = bySource.get(key);
    if (!current || score(row) > score(current)) {
      if (current) duplicateCount += 1;
      bySource.set(key, row);
    } else {
      duplicateCount += 1;
    }
  }

  const dropped = [];
  const cleaned = [];
  for (const row of bySource.values()) {
    if (!isUsable(row)) {
      dropped.push(row.slug || row.id || row.sourceUrl || "(missing)");
      continue;
    }
    cleaned.push(normalizeRow(row));
  }

  const sorted = sortRows(cleaned);
  writeJson(FDA_PATH, sorted);
  writeJson(IMAGE_MAP_PATH, {});
  writeJson(HASH_PATH, sorted.map(hashRecord).sort());

  console.log("FDA backup seed restored");
  console.log(`Input records      : ${backup.length}`);
  console.log(`Duplicates removed : ${duplicateCount}`);
  console.log(`Incomplete dropped : ${dropped.length}`);
  console.log(`Output records     : ${sorted.length}`);
  if (dropped.length) console.log(`Dropped samples    : ${dropped.slice(0, 8).join(", ")}`);
}

main();
