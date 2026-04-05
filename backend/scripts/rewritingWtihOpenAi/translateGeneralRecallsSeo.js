/**
 * Reads generalRecallsJson/*.json, rewrites recall copy via OpenAI,
 * downloads Images to frontend/public/images/generalRecalls as WebP (quality 85),
 * replaces each Images[].URL with the site-relative path:
 *   /images/generalRecalls/<categorySlug>/<1-basedIndex>-<slugified-Products[0].Name>/<hash>.webp
 * keeps original CPSC URL in Images[].SourceImageURL.
 * Output recall fields: `slug` (stable URL key), optional `metaDescription` (≤160). No full `seo` object.
 * Next.js derives OG/Twitter from JSON at runtime (see frontend/lib/general-recalls-seo.ts).
 *
 * Env: OPENAI_API_KEY (required for translate / retailers-only). Optional: OPENAI_MODEL (default gpt-4o-mini)
 *
 * Run from backend/:  npm run translate-general-recalls  (scripts/rewritingWtihOpenAi/)
 * Resume: skips recalls that already have `slug` and finished image processing (local /images/... or ImageFetchFailed).
 * Saves after each recall so crash/exit can continue later. Use --force to reprocess everything.
 *
 * Failed downloads: Images get ImageFetchFailed; see <jsonBase>.txt per recall image folder ("<url> FAILED <status>").
 * Retry failed images only (no OpenAI): node ... --retry-failed  or npm run retry-failed-general-recalls-images
 * Retailers-only (translated JSON in place): node ... --retailers-only
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const sharp = require("sharp");
const OpenAI = require("openai");
require("dotenv").config({
  path: fs.existsSync(path.join(__dirname, ".env"))
    ? path.join(__dirname, ".env")
    : path.join(__dirname, "..", "..", ".env"),
});

const ROOT = __dirname;
const REPO_ROOT = path.join(ROOT, "..", "..", "..");
const GR_ROOT = path.join(ROOT, "..", "generalRecalls");
const SRC_DIR = path.join(GR_ROOT, "generalRecallsJson");
const OUT_DIR = path.join(GR_ROOT, "generalRecallsTranslated");
const MAP_PATH = path.join(OUT_DIR, "imageUrlMap.json");
const IMG_DIR = path.join(REPO_ROOT, "frontend", "public", "images", "generalRecalls");

const BASE_URL = "https://www.recallsatlas.com";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let openaiSingleton = null;
function getOpenAI() {
  if (!openaiSingleton) openaiSingleton = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openaiSingleton;
}

const isTTY = process.stdout.isTTY;

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function logLine(msg) {
  if (isTTY) process.stdout.write("\r\x1b[K");
  console.log(msg);
}

function statusBar(label, current, total, detail = "") {
  const w = 24;
  const pct = total > 0 ? Math.min(1, current / total) : 0;
  const filled = Math.round(w * pct);
  const bar = "█".repeat(filled) + "░".repeat(w - filled);
  const d = detail ? ` ${c.dim}${detail.slice(0, 42)}${c.reset}` : "";
  const line = `${c.cyan}${label}${c.reset} ${bar} ${String(current).padStart(3)}/${total}${d}`;
  if (isTTY) {
    process.stdout.write(`\r${line}`);
  } else {
    console.log(line);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Random integer ms in [1000, 8000] — wait before each network image download */
function randomImageDelayMs() {
  return 1000 + Math.floor(Math.random() * 7001);
}

function loadImageMap() {
  if (!fs.existsSync(MAP_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveImageMap(map) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), "utf8");
}

/** Safe directory name under public/images/generalRecalls/<this>/ */
function safeImageFolderSlug(s) {
  const t = String(s || "misc")
    .replace(/[^a-z0-9-_]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return t || "misc";
}

function imageMapKey(categorySlug, recallRelFolder, url) {
  const cat = safeImageFolderSlug(categorySlug);
  const rel = safeImageFolderSlug(recallRelFolder);
  return `${cat}/${rel}::${url}`;
}

/** Per-recall folder: 1-based index in category file + slugified first product name. */
function recallImageSubfolder(index1Based, recall) {
  const raw = (recall.Products && recall.Products[0] && recall.Products[0].Name) || "product";
  const part = safeImageFolderSlug(raw);
  return `${index1Based}-${part || "product"}`;
}

/** Same basename as the source JSON (e.g. accessories.txt next to WebPs in that recall folder). */
function failedImageLogPath(categorySlug, recallRelFolder, jsonBaseName) {
  const cat = safeImageFolderSlug(categorySlug);
  const rel = safeImageFolderSlug(recallRelFolder);
  const base = safeImageFolderSlug(jsonBaseName || cat);
  return path.join(IMG_DIR, cat, rel, `${base}.txt`);
}

/** Append one line: "<url> FAILED <status>" (deduped by URL). */
function recordFailedImageUrl(categorySlug, recallRelFolder, jsonBaseName, url, status) {
  const u = String(url || "").trim();
  if (!u) return;
  const p = failedImageLogPath(categorySlug, recallRelFolder, jsonBaseName);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  let existing = "";
  if (fs.existsSync(p)) existing = fs.readFileSync(p, "utf8");
  const lines = existing.split(/\r?\n/).filter(Boolean);
  if (lines.some((line) => line.startsWith(u + " FAILED"))) return;
  const st = status == null ? "UNKNOWN" : String(status);
  fs.appendFileSync(p, `${u} FAILED ${st}\n`, "utf8");
}

/** Remove the line for this URL (format: "<url> FAILED <status>"). */
function removeFailedImageUrlLine(categorySlug, recallRelFolder, jsonBaseName, url) {
  const u = String(url || "").trim();
  if (!u) return;
  const p = failedImageLogPath(categorySlug, recallRelFolder, jsonBaseName);
  if (!fs.existsSync(p)) return;
  const lines = fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      return !t.startsWith(u + " FAILED");
    });
  fs.writeFileSync(p, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
}

function normRecallNumber(n) {
  return String(n == null ? "" : n).trim();
}

function getRecallSlug(r) {
  if (!r || typeof r !== "object") return "";
  if (typeof r.slug === "string" && r.slug.trim()) return r.slug.trim();
  if (r.seo && typeof r.seo.slug === "string" && r.seo.slug.trim()) return r.seo.slug.trim();
  return "";
}

/** Every image URL is either local (/images/...) or a failed fetch (still https + ImageFetchFailed). */
function imagesProcessingComplete(r) {
  if (!r || typeof r !== "object") return false;
  const imgs = r.Images || [];
  for (const im of imgs) {
    const u = String(im.URL || "").trim();
    if (!u) continue;
    if (u.startsWith("/images/")) continue;
    if (/^https?:\/\//i.test(u) && im.ImageFetchFailed) continue;
    return false;
  }
  return true;
}

/** Finished translated recall (safe to skip on resume): stable slug + images pass done. */
function isTranslatedRecall(r) {
  return Boolean(r && typeof r === "object" && getRecallSlug(r) && imagesProcessingComplete(r));
}

/** Load prior output: RecallNumber -> recall (last wins if duplicates). */
function loadExistingTranslatedByRecallNumber(outPath) {
  const map = new Map();
  if (!fs.existsSync(outPath)) return map;
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
    for (const r of prev.recalls || []) {
      const n = normRecallNumber(r.RecallNumber);
      if (n) map.set(n, r);
    }
  } catch {
    /* ignore corrupt file */
  }
  return map;
}

function writeTranslatedFile(outPath, meta, fileName, outRecalls, partial) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outDoc = {
    meta: {
      ...meta,
      openaiModel: MODEL,
      sourceJson: fileName,
      ...(partial
        ? { resumePartial: true }
        : { seoTranslatedAt: new Date().toISOString(), resumePartial: false }),
    },
    recalls: outRecalls,
  };
  fs.writeFileSync(outPath, JSON.stringify(outDoc, null, 2), "utf8");
}

function slugifyTitleForUrl(title) {
  const s = String(title || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = s ? `${s}-recall` : "recall";
  return base;
}

function buildSeoSlug(title, recallNumber, usedSlugs) {
  const base = slugifyTitleForUrl(title);
  let slug = base;
  let n = 0;
  while (usedSlugs.has(slug)) {
    n += 1;
    slug = `${base}-${recallNumber || "x"}${n > 1 ? `-${n}` : ""}`;
  }
  usedSlugs.add(slug);
  return slug;
}

function upcStringsFromRecall(recall) {
  const raw = recall.ProductUPCs || [];
  const out = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
    else if (x && x.UPC) out.push(String(x.UPC).trim());
  }
  return [...new Set(out.filter(Boolean))];
}

async function callOpenAiJson(recall) {
  const products = recall.Products || [];
  const hazards = recall.Hazards || [];
  const remedies = recall.Remedies || [];
  const retailers = recall.Retailers || [];

  const payload = {
    Title: recall.Title || "",
    Description: recall.Description || "",
    ConsumerContact: recall.ConsumerContact || "",
    Products: products.map((p) => ({ Name: p.Name || "", Model: p.Model || "", Type: p.Type || "" })),
    Hazards: hazards.map((h) => h.Name || ""),
    Remedies: remedies.map((r) => r.Name || ""),
    Retailers: retailers.map((x) => x.Name || ""),
    ExistingUPCs: upcStringsFromRecall(recall),
  };

  const system = `You rewrite CPSC recall content for RecallsAtlas (independent consumer safety site). 
Output a single JSON object only, no markdown. Facts must stay accurate; wording must be original for SEO (not copied verbatim from source).
Keep phone numbers, emails, URLs exactly as given when present.`;

  const user = `Rewrite for SEO and clarity. Return JSON with exactly these keys:
{
  "Title": string (main page headline; if multiple products, summarize the recall — do not drop key product names),
  "Description": string (2–4 short paragraphs plain text, no HTML),
  "ConsumerContact": string (what consumers should do / who to contact),
  "ProductNames": string[] (same length as input Products — one rewritten display name per product, order preserved),
  "HazardNames": string[] (same length as input Hazards),
  "RemedyNames": string[] (same length as input Remedies),
  "RetailerNames": string[] (same length as input Retailers; rewrite "sold at" lines for clarity),
  "MetaDescription": string (≤160 chars, compelling, unique),
  "ExtractedUPCs": string[] (all UPC/EAN/GTIN codes you find in the source text; dedupe; empty if none),
  "ExtractedIdentifiers": string[] (model numbers, SKU, FNSKU, batch phrases not in UPC list; empty if none)
}

Input:
${JSON.stringify(payload, null, 2)}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI message");
  return JSON.parse(raw);
}

function applyAiToRecall(recall, ai) {
  const out = JSON.parse(JSON.stringify(recall));
  out.Title = ai.Title ?? out.Title;
  out.Description = ai.Description ?? out.Description;
  out.ConsumerContact = ai.ConsumerContact ?? out.ConsumerContact;

  const pns = Array.isArray(ai.ProductNames) ? ai.ProductNames : [];
  if (out.Products && out.Products.length) {
    out.Products = out.Products.map((p, i) => ({
      ...p,
      Name: pns[i] != null && String(pns[i]).trim() ? String(pns[i]).trim() : p.Name,
    }));
  }

  const hns = Array.isArray(ai.HazardNames) ? ai.HazardNames : [];
  if (out.Hazards && out.Hazards.length) {
    out.Hazards = out.Hazards.map((h, i) => ({
      ...h,
      Name: hns[i] != null && String(hns[i]).trim() ? String(hns[i]).trim() : h.Name,
    }));
  }

  const rns = Array.isArray(ai.RemedyNames) ? ai.RemedyNames : [];
  if (out.Remedies && out.Remedies.length) {
    out.Remedies = out.Remedies.map((r, i) => ({
      ...r,
      Name: rns[i] != null && String(rns[i]).trim() ? String(rns[i]).trim() : r.Name,
    }));
  }

  const rtns = Array.isArray(ai.RetailerNames) ? ai.RetailerNames : [];
  if (out.Retailers && out.Retailers.length) {
    out.Retailers = out.Retailers.map((ret, i) => ({
      ...ret,
      Name: rtns[i] != null && String(rtns[i]).trim() ? String(rtns[i]).trim() : ret.Name,
    }));
  }

  const upcs = [...upcStringsFromRecall(out)];
  if (Array.isArray(ai.ExtractedUPCs)) {
    for (const u of ai.ExtractedUPCs) {
      const t = String(u || "").trim();
      if (t && !upcs.includes(t)) upcs.push(t);
    }
  }
  if (upcs.length) out.ProductUPCs = upcs.map((u) => ({ UPC: u }));
  else delete out.ProductUPCs;

  if (Array.isArray(ai.ExtractedIdentifiers) && ai.ExtractedIdentifiers.length) {
    out.ExtractedIdentifiers = [...new Set(ai.ExtractedIdentifiers.map((x) => String(x || "").trim()).filter(Boolean))];
  }

  return out;
}

async function callOpenAiRetailersOnly(recall) {
  const retailers = recall.Retailers || [];
  const payload = { Retailers: retailers.map((x) => x.Name || "") };

  const system = `You rewrite CPSC recall "sold at" / retailer lines for RecallsAtlas. Output a single JSON object only, no markdown. Facts must stay accurate.`;

  const user = `Return JSON with exactly this key:
{ "RetailerNames": string[] } — same length and order as input Retailers.

Input:
${JSON.stringify(payload, null, 2)}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.35,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI message");
  return JSON.parse(raw);
}

function applyRetailersAiOnly(recall, ai) {
  const out = JSON.parse(JSON.stringify(recall));
  const rtns = Array.isArray(ai.RetailerNames) ? ai.RetailerNames : [];
  if (out.Retailers && out.Retailers.length) {
    out.Retailers = out.Retailers.map((ret, i) => ({
      ...ret,
      Name: rtns[i] != null && String(rtns[i]).trim() ? String(rtns[i]).trim() : ret.Name,
    }));
  }
  return out;
}

async function retryFailedImagesInRecall(recall, imageMap, categorySlug, recallRelFolder, fileName, jsonBaseName) {
  const merged = recall;
  let changed = false;
  for (const img of merged.Images || []) {
    if (!img.ImageFetchFailed) continue;
    const src = String(img.SourceImageURL || img.URL || "").trim();
    if (!/^https?:\/\//i.test(src)) continue;
    const result = await ensureWebpForUrl(src, imageMap, categorySlug, recallRelFolder, merged.URL, fileName);
    if (result.ok) {
      const info = result.entry;
      img.SourceImageURL = src;
      img.URL = info.publicPath;
      delete img.ImageFetchFailed;
      delete img.ImageFetchHttpStatus;
      removeFailedImageUrlLine(categorySlug, recallRelFolder, jsonBaseName, src);
      changed = true;
    } else {
      recordFailedImageUrl(categorySlug, recallRelFolder, jsonBaseName, src, result.status);
    }
  }
  return changed;
}

async function retryFailedImagesMain() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error("Missing output folder:", OUT_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(OUT_DIR).filter((n) => n.endsWith(".json")).sort();
  if (files.length === 0) {
    console.error("No JSON files in", OUT_DIR);
    process.exit(1);
  }

  logLine(`${c.bold}Retry failed images only${c.reset} (no OpenAI)`);
  logLine(`${c.dim}Reading:${c.reset} ${OUT_DIR}`);
  logLine(`${c.dim}Logs:${c.reset}    ${IMG_DIR}/<category>/<index-product>/<jsonBase>.txt\n`);

  const imageMap = loadImageMap();
  firstNetworkImage = true;
  let totalRetried = 0;

  for (let fi = 0; fi < files.length; fi++) {
    const fileName = files[fi];
    const outPath = path.join(OUT_DIR, fileName);
    const raw = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const meta = raw.meta || {};
    const recalls = raw.recalls || [];
    const folderSlug = safeImageFolderSlug(meta.slug || path.basename(fileName, ".json"));
    const jsonBase = path.basename(fileName, ".json");
    let fileChanged = false;

    for (let i = 0; i < recalls.length; i++) {
      const r = recalls[i];
      const hasFailed = (r.Images || []).some((im) => im.ImageFetchFailed);
      if (!hasFailed) continue;
      const relFolder = recallImageSubfolder(i + 1, r);
      statusBar(`Retry ${fi + 1}/${files.length}`, i, recalls.length, `${fileName} #${r.RecallNumber || ""}`);
      totalRetried++;
      const changed = await retryFailedImagesInRecall(r, imageMap, folderSlug, relFolder, fileName, jsonBase);
      if (changed) fileChanged = true;
    }

    if (isTTY) process.stdout.write("\r\x1b[K");
    if (fileChanged) {
      fs.writeFileSync(
        outPath,
        JSON.stringify({ ...raw, recalls }, null, 2),
        "utf8"
      );
      saveImageMap(imageMap);
      logLine(`${c.green}✓${c.reset} updated ${fileName}`);
    }
  }

  if (totalRetried === 0) {
    logLine(`${c.dim}No ImageFetchFailed entries found — nothing to retry.${c.reset}`);
  }
  logLine(`\n${c.green}Retry pass done.${c.reset}`);
}

let firstNetworkImage = true;

/** CPSC S3 often returns 403 without a browser-like Referer / User-Agent. */
function imageFetchHeaders(imageUrl, cpscRecallPageUrl) {
  let host = "";
  try {
    host = new URL(imageUrl).hostname.toLowerCase();
  } catch {
    return {};
  }
  const h = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (host.includes("cpsc.gov")) {
    const page =
      cpscRecallPageUrl && /^https?:\/\/(www\.)?cpsc\.gov\//i.test(String(cpscRecallPageUrl).trim())
        ? String(cpscRecallPageUrl).trim()
        : "https://www.cpsc.gov/";
    h.Referer = page;
    h.Origin = "https://www.cpsc.gov";
  }
  return h;
}

/** @returns {{ ok: true, entry: object } | { ok: false, status: string|number, url: string }} */
async function ensureWebpForUrl(
  imageUrl,
  imageMap,
  categorySlug,
  recallRelFolder,
  cpscRecallPageUrl,
  sourceJsonFile
) {
  const url = String(imageUrl || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, status: "INVALID", url: String(imageUrl || "") };
  }

  const cat = safeImageFolderSlug(categorySlug);
  const rel = safeImageFolderSlug(recallRelFolder);
  const mapRel = `${cat}/${rel}`;
  const key = imageMapKey(categorySlug, recallRelFolder, url);
  const label = sourceJsonFile ? `[${sourceJsonFile}] ` : "";

  if (imageMap[key]) {
    return { ok: true, entry: imageMap[key] };
  }

  if (!firstNetworkImage) {
    const wait = randomImageDelayMs();
    if (isTTY) process.stdout.write("\r\x1b[K");
    logLine(
      `${c.dim}    ${label}…waiting ${(wait / 1000).toFixed(1)}s before next image download${c.reset}`
    );
    await sleep(wait);
  }
  firstNetworkImage = false;

  let res;
  try {
    res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024,
      headers: imageFetchHeaders(url, cpscRecallPageUrl),
      validateStatus: (s) => s >= 200 && s < 400,
    });
  } catch (e) {
    const status = e.response?.status ?? e.code ?? "ERR";
    logLine(
      `${c.yellow}Image fetch failed${c.reset} ${label}${status} ${url.slice(0, 72)}…`
    );
    return { ok: false, status, url };
  }

  let webpBuffer;
  try {
    const input = Buffer.from(res.data);
    webpBuffer = await sharp(input).webp({ quality: 85 }).toBuffer();
  } catch (e) {
    logLine(`${c.yellow}Image WebP convert failed${c.reset} ${label}${url.slice(0, 72)}… → ${e.message}`);
    return { ok: false, status: "CONVERT", url };
  }

  const hash = crypto.createHash("sha256").update(webpBuffer).digest("hex").slice(0, 32);
  const outFile = `${hash}.webp`;
  const outDir = path.join(IMG_DIR, cat, rel);

  fs.mkdirSync(outDir, { recursive: true });
  const fullPath = path.join(outDir, outFile);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, webpBuffer);
  }

  const entry = {
    folder: mapRel,
    fileName: outFile,
    publicPath: `/images/generalRecalls/${mapRel}/${outFile}`,
    absoluteUrl: `${BASE_URL}/images/generalRecalls/${mapRel}/${outFile}`,
    sourceUrl: url,
  };
  imageMap[key] = entry;
  return { ok: true, entry };
}

async function processRecall(
  recall,
  imageMap,
  usedSlugs,
  onImage,
  categorySlug,
  sourceJsonFile,
  jsonBaseName,
  recallIndex1Based
) {
  let ai;
  try {
    ai = await callOpenAiJson(recall);
  } catch (e) {
    logLine(`${c.yellow}OpenAI failed Recall ${recall.RecallNumber}: ${e.message}${c.reset}`);
    ai = {
      Title: recall.Title,
      Description: recall.Description,
      ConsumerContact: recall.ConsumerContact,
      ProductNames: (recall.Products || []).map((p) => p.Name),
      HazardNames: (recall.Hazards || []).map((h) => h.Name),
      RemedyNames: (recall.Remedies || []).map((r) => r.Name),
      RetailerNames: (recall.Retailers || []).map((x) => x.Name),
      MetaDescription: (recall.Description || "").slice(0, 160),
      ExtractedUPCs: [],
      ExtractedIdentifiers: [],
    };
  }

  const merged = applyAiToRecall(recall, ai);
  merged._metaDescription = ai.MetaDescription || merged.Description?.slice(0, 160);

  const slug = buildSeoSlug(merged.Title, merged.RecallNumber, usedSlugs);
  const relFolder = recallImageSubfolder(recallIndex1Based, merged);

  const images = Array.isArray(merged.Images) ? merged.Images : [];
  const baseName = jsonBaseName || path.basename(sourceJsonFile || "", ".json");
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = String(img.URL || img.url || img.Url || "").trim();
    onImage?.(i + 1, images.length, src);
    const result = await ensureWebpForUrl(src, imageMap, categorySlug, relFolder, merged.URL, sourceJsonFile);
    delete img.ImageFetchFailed;
    delete img.ImageFetchHttpStatus;
    if (result.ok) {
      const info = result.entry;
      img.SourceImageURL = src;
      img.URL = info.publicPath;
      delete img.url;
      delete img.Url;
      removeFailedImageUrlLine(categorySlug, relFolder, baseName, src);
    } else {
      img.SourceImageURL = src;
      img.URL = src;
      delete img.url;
      delete img.Url;
      img.ImageFetchFailed = true;
      img.ImageFetchHttpStatus = result.status;
      recordFailedImageUrl(categorySlug, relFolder, baseName, src, result.status);
    }
  }

  merged.slug = slug;
  const meta =
    typeof merged._metaDescription === "string" && merged._metaDescription.trim()
      ? merged._metaDescription.trim().slice(0, 160)
      : (merged.Description || "").slice(0, 160);
  if (meta) merged.metaDescription = meta;
  delete merged._metaDescription;
  delete merged.seo;
  return merged;
}

function canSkipAllRecalls(sourceRecalls, existingByNum, force) {
  if (force || sourceRecalls.length === 0) return false;
  for (const src of sourceRecalls) {
    const n = normRecallNumber(src.RecallNumber);
    if (!n) return false;
    const c = existingByNum.get(n);
    if (!isTranslatedRecall(c)) return false;
  }
  return true;
}

async function processJsonFile(fileName, imageMap, fileIndex, fileTotal, force) {
  const srcPath = path.join(SRC_DIR, fileName);
  const outPath = path.join(OUT_DIR, fileName);
  const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const meta = raw.meta || {};
  const recalls = raw.recalls || [];
  const usedSlugs = new Set();
  const folderSlug = safeImageFolderSlug(meta.slug || path.basename(fileName, ".json"));

  const existingByNum = force ? new Map() : loadExistingTranslatedByRecallNumber(outPath);
  for (const r of existingByNum.values()) {
    const s = getRecallSlug(r);
    if (s) usedSlugs.add(s);
  }

  if (canSkipAllRecalls(recalls, existingByNum, force)) {
    logLine(
      `${c.dim}○ skip (resume)${c.reset} ${fileName}  ${c.dim}— all ${recalls.length} recalls already translated${c.reset}`
    );
    return;
  }

  const outRecalls = [];

  for (let i = 0; i < recalls.length; i++) {
    const srcRecall = recalls[i];
    const num = normRecallNumber(srcRecall.RecallNumber);
    const cached = num ? existingByNum.get(num) : null;

    statusBar(
      `File ${fileIndex}/${fileTotal}`,
      i,
      recalls.length,
      `${fileName} · recall ${num || i + 1}`
    );

    let done;
    if (!force && cached && isTranslatedRecall(cached)) {
      done = JSON.parse(JSON.stringify(cached));
    } else {
      try {
        done = await processRecall(
          srcRecall,
          imageMap,
          usedSlugs,
          (cur, tot, url) => {
            statusBar(
              `File ${fileIndex}/${fileTotal}`,
              i,
              recalls.length,
              `img ${cur}/${tot}`
            );
          },
          folderSlug,
          fileName,
          path.basename(fileName, ".json"),
          i + 1
        );
      } catch (e) {
        writeTranslatedFile(outPath, meta, fileName, outRecalls, true);
        saveImageMap(imageMap);
        logLine(`${c.red}Stopped mid-file${c.reset} ${fileName} — saved ${outRecalls.length} recalls. Re-run to resume.`);
        throw e;
      }
    }
    outRecalls.push(done);

    writeTranslatedFile(outPath, meta, fileName, outRecalls, outRecalls.length < recalls.length);
    saveImageMap(imageMap);
  }

  if (isTTY) process.stdout.write("\r\x1b[K");

  writeTranslatedFile(outPath, meta, fileName, outRecalls, false);
  saveImageMap(imageMap);

  logLine(`${c.green}✓${c.reset} ${fileName}  ${c.dim}→${c.reset} generalRecallsTranslated/${fileName}  (${outRecalls.length} recalls)`);
}

function parseFlags() {
  const argv = process.argv.slice(2);
  return {
    force: argv.includes("--force") || argv.includes("-f"),
    retryFailed: argv.includes("--retry-failed") || argv.includes("--retry"),
    retailersOnly: argv.includes("--retailers-only"),
  };
}

async function mainTranslate() {
  const { force } = parseFlags();

  if (!OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY in backend/.env");
    process.exit(1);
  }
  if (!fs.existsSync(SRC_DIR)) {
    console.error("Missing source folder:", SRC_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((n) => n.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.error("No JSON files in", SRC_DIR);
    process.exit(1);
  }

  logLine(`${c.bold}RecallsAtlas — general recalls SEO + images${c.reset}`);
  logLine(`${c.dim}Source:${c.reset} ${SRC_DIR}`);
  logLine(`${c.dim}Out:${c.reset}    ${OUT_DIR}`);
  logLine(
    `${c.dim}Images:${c.reset} ${IMG_DIR}/<category>/<index-product>/ (WebP q=85, 1–8s between downloads)`
  );
  logLine(
    `${c.dim}Resume:${c.reset} skips recalls with ${c.dim}slug${c.reset} + finished images (use --force to redo)`
  );
  logLine(`${c.dim}Files:${c.reset}  ${files.length}${force ? `  ${c.yellow}--force${c.reset}` : ""}\n`);

  const imageMap = loadImageMap();
  firstNetworkImage = true;

  for (let fi = 0; fi < files.length; fi++) {
    await processJsonFile(files[fi], imageMap, fi + 1, files.length, force);
  }

  logLine(`\n${c.green}All done.${c.reset} Image URL map: ${MAP_PATH}`);
}

async function retailersOnlyMain() {
  if (!OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY in backend/.env");
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) {
    console.error("Missing output folder:", OUT_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(OUT_DIR).filter((n) => n.endsWith(".json")).sort();
  if (files.length === 0) {
    console.error("No JSON files in", OUT_DIR);
    process.exit(1);
  }

  logLine(`${c.bold}Retailers-only pass${c.reset} (OpenAI, generalRecallsTranslated/*.json)`);

  for (let fi = 0; fi < files.length; fi++) {
    const fileName = files[fi];
    const outPath = path.join(OUT_DIR, fileName);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(outPath, "utf8"));
    } catch (e) {
      logLine(`${c.yellow}Skip corrupt ${fileName}${c.reset}`);
      continue;
    }
    const recalls = raw.recalls || [];
    let changed = false;
    for (let i = 0; i < recalls.length; i++) {
      const r = recalls[i];
      if (!r.Retailers || !r.Retailers.length) continue;
      statusBar(`Retailers ${fi + 1}/${files.length}`, i, recalls.length, fileName);
      try {
        const ai = await callOpenAiRetailersOnly(r);
        recalls[i] = applyRetailersAiOnly(r, ai);
        changed = true;
      } catch (e) {
        logLine(`${c.yellow}OpenAI retailers failed ${fileName} #${r.RecallNumber}: ${e.message}${c.reset}`);
      }
    }
    if (isTTY) process.stdout.write("\r\x1b[K");
    if (changed) {
      fs.writeFileSync(outPath, JSON.stringify({ ...raw, recalls }, null, 2), "utf8");
      logLine(`${c.green}✓${c.reset} updated ${fileName}`);
    }
  }
  logLine(`\n${c.green}Retailers-only pass done.${c.reset}`);
}

async function run() {
  const flags = parseFlags();
  if (flags.retailersOnly) {
    await retailersOnlyMain();
  } else if (flags.retryFailed) {
    await retryFailedImagesMain();
  } else {
    await mainTranslate();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
