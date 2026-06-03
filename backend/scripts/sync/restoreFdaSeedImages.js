"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const sharp = require("sharp");

const BACKEND_ROOT = path.join(__dirname, "..", "..");
const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const BACKUP_PATH = path.join(BACKEND_ROOT, "scripts", "do-not-delete(backups).json");
const FDA_PATH = path.join(BACKEND_ROOT, "fdaRecalls", "data", "fda-recalls-en-eeat.json");
const IMAGE_MAP_PATH = path.join(BACKEND_ROOT, "fdaRecalls", "data", "image-map.json");
const IMAGE_ROOT = path.join(REPO_ROOT, "frontend", "public", "images", "recalls");

const MAX_WIDTH = Number.parseInt(process.env.IMAGE_MAX_WIDTH || "700", 10);
const WEBP_QUALITY = Number.parseInt(process.env.IMAGE_WEBP_QUALITY || "80", 10);
const CONCURRENCY = Number.parseInt(process.env.IMAGE_RESTORE_CONCURRENCY || "6", 10);
const MAX_RETRIES = Number.parseInt(process.env.IMAGE_RESTORE_RETRIES || "3", 10);

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
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

function backupKey(row) {
  return normalizeUrl(row.sourceUrl || row.source_url) || cleanText(row.slug || row.id);
}

function imageUrlFrom(value) {
  if (typeof value === "string") return value;
  return value?.url || value?.URL || "";
}

function captionFrom(value) {
  if (!value || typeof value !== "object") return "";
  return cleanText(value.caption || value.Caption || "");
}

function localImagePath(localUrl) {
  const relative = String(localUrl || "").replace(/^\//, "");
  const full = path.join(REPO_ROOT, "frontend", "public", relative);
  const resolved = path.resolve(full);
  const root = path.resolve(IMAGE_ROOT);
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to write outside image root: ${localUrl}`);
  }
  return resolved;
}

function fallbackLocalUrl(row, sourceUrl, index) {
  const folder = `${row.sortOrder || row.slug}-${row.slug}`.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  const digest = crypto.createHash("sha256").update(sourceUrl).digest("hex");
  return `/images/recalls/${folder}/${digest}-${index + 1}.webp`;
}

function collectJobs(row, backupRow) {
  const rawSources = Array.isArray(row.rawImageSources) ? row.rawImageSources : [];
  const backupImages = Array.isArray(backupRow?.images) ? backupRow.images : [];
  const jobs = [];

  rawSources.forEach((sourceUrl, index) => {
    const source = normalizeUrl(sourceUrl);
    if (!source) return;
    const backupLocal = imageUrlFrom(backupImages[index]);
    const localUrl = backupLocal && backupLocal.startsWith("/images/recalls/")
      ? backupLocal
      : fallbackLocalUrl(row, source, index);
    jobs.push({
      slug: row.slug,
      sourceUrl: source,
      localUrl,
      caption: captionFrom(backupImages[index]) || "Product recall image",
    });
  });

  return jobs;
}

async function downloadBuffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "RecallsAtlas/1.0 (+https://recallsatlas.com)",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  return Buffer.from(response.data);
}

async function saveImage(job) {
  const outputPath = localImagePath(job.localUrl);
  if (fs.existsSync(outputPath)) return { ok: true, skipped: true, job };

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const buffer = await downloadBuffer(job.sourceUrl);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await sharp(buffer)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toFile(outputPath);
      return { ok: true, skipped: false, job };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }

  return { ok: false, job, error: lastError?.message || "unknown error" };
}

async function runPool(jobs) {
  let index = 0;
  const results = [];

  async function worker() {
    while (index < jobs.length) {
      const jobIndex = index;
      index += 1;
      const result = await saveImage(jobs[jobIndex]);
      results[jobIndex] = result;
      const mark = result.ok ? (result.skipped ? "cached" : "saved") : "failed";
      console.log(`${jobIndex + 1}/${jobs.length} ${mark} ${jobs[jobIndex].localUrl}`);
      if (!result.ok) console.log(`  ${result.error}`);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  return results;
}

async function main() {
  const backupRows = readJson(BACKUP_PATH, []);
  const rows = readJson(FDA_PATH, []);
  if (!Array.isArray(backupRows)) throw new Error(`${BACKUP_PATH} must be a JSON array`);
  if (!Array.isArray(rows)) throw new Error(`${FDA_PATH} must be a JSON array`);

  const backupByKey = new Map();
  for (const row of backupRows) {
    const key = backupKey(row);
    if (key && !backupByKey.has(key)) backupByKey.set(key, row);
  }

  const rowJobs = new Map();
  const allJobs = [];
  for (const row of rows) {
    const jobs = collectJobs(row, backupByKey.get(backupKey(row)));
    rowJobs.set(row.slug, jobs);
    allJobs.push(...jobs);
  }

  const uniqueJobs = [];
  const seen = new Set();
  for (const job of allJobs) {
    const key = `${job.sourceUrl}|${job.localUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueJobs.push(job);
  }

  console.log(`Restoring ${uniqueJobs.length} FDA seed images...`);
  const results = await runPool(uniqueJobs);
  const okByLocalUrl = new Map();
  for (const result of results) {
    okByLocalUrl.set(result.job.localUrl, result.ok);
  }

  const imageMap = {};
  let rowsWithImages = 0;
  let restoredRefs = 0;
  for (const row of rows) {
    const restored = (rowJobs.get(row.slug) || [])
      .filter((job) => okByLocalUrl.get(job.localUrl))
      .map((job) => {
        imageMap[job.sourceUrl] = path.basename(job.localUrl);
        return job.localUrl;
      });

    if (restored.length) {
      row.images = restored;
      row.image = {
        "@type": "ImageObject",
        url: restored[0],
        caption: row.title || row.headline || "Product recall image",
      };
      rowsWithImages += 1;
      restoredRefs += restored.length;
    }
  }

  writeJson(FDA_PATH, rows);
  writeJson(IMAGE_MAP_PATH, imageMap);

  const failed = results.filter((result) => !result.ok);
  console.log("FDA seed images restored");
  console.log(`Jobs attempted   : ${uniqueJobs.length}`);
  console.log(`Image refs saved : ${restoredRefs}`);
  console.log(`Rows with images : ${rowsWithImages}`);
  console.log(`Failed downloads : ${failed.length}`);
  if (failed.length) {
    console.log("Failed samples:");
    for (const result of failed.slice(0, 12)) console.log(`- ${result.job.sourceUrl} -> ${result.error}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
