"use strict";

/**
 * Headless scrape-logic smoke test: FDA recalls listing + first N detail pages.
 * No OpenAI and no rewritten content.
 * Output shape is recall-like (similar to recalls.json) but excludes "content".
 * Writes results to testing.json (same folder as this script).
 *
 * Run from backend/:
 *   node scripts/testing/fdaHeadlessListSmoke.js
 *   node scripts/testing/fdaHeadlessListSmoke.js 10
 */

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT_JSON = path.join(__dirname, "testing.json");

const FDA_LIST_URL =
  "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts";
const SITE_BASE_URL = "https://recallsatlas.com";
const SITE_RECALLS_PATH = "/recalls";

const NAV_TIMEOUT = 120000;
const HEADLESS = true;
const DEFAULT_LIMIT = 5;

/** Same range as scrapeRecalls.js — random pause between FDA actions. */
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 8000;

const limit = Math.min(
  50,
  Math.max(1, parseInt(process.argv[2], 10) || DEFAULT_LIMIT)
);

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function timeShort() {
  return new Date().toTimeString().slice(0, 8);
}

function log(msg) {
  console.log(`  ${C.dim}${timeShort()}${C.reset}  ${msg}`);
}

function logPhase(label) {
  console.log(`\n  ${C.cyan}▸${C.reset} ${C.bold}${label}${C.reset}`);
}

function logOk(msg) {
  console.log(`  ${C.green}✓${C.reset} ${msg}`);
}

function logWarn(msg) {
  console.log(`  ${C.yellow}⚠${C.reset} ${msg}`);
}

function header(title) {
  const w = 56;
  const line = "═".repeat(w);
  console.log(`\n${C.cyan}${C.bold}  ${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${line}${C.reset}\n`);
}

function progressBar(current, total, width = 28) {
  if (total <= 0) total = 1;
  const ratio = Math.min(current, total) / total;
  const filled = Math.round(ratio * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pct = String(Math.round(ratio * 100)).padStart(3);
  return `[${bar}] ${pct}%`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomDelay(label = "") {
  const ms = randomInt(MIN_DELAY_MS, MAX_DELAY_MS);
  const suffix = label ? ` → ${label}` : "";
  log(`${C.dim}Waiting ${ms}ms${suffix}${C.reset}`);
  await sleep(ms);
}

async function gotoWithRetry(page, url, waitSelector) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      if (waitSelector) await page.waitForSelector(waitSelector, { timeout: NAV_TIMEOUT });
      return true;
    } catch (e) {
      logWarn(`Navigation attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) return false;
      const backoff = randomInt(2000 * attempt, 4000 * attempt);
      log(`  ${C.dim}Retry in ${backoff}ms…${C.reset}`);
      await sleep(backoff);
    }
  }
  return false;
}

async function waitForDatatableReady(page) {
  await page.waitForSelector("#datatable", { timeout: NAV_TIMEOUT });
  await page.waitForSelector("#datatable tbody tr", { timeout: NAV_TIMEOUT });
  await page
    .waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 })
    .catch(() => {});
  await page
    .waitForSelector("#datatable_processing", { state: "hidden", timeout: NAV_TIMEOUT })
    .catch(() => {});
}

async function extractListRows(page) {
  return page.evaluate(() => {
    const clean = (v) => (v || "").replace(/\s+/g, " ").trim();
    const rows = [];
    document.querySelectorAll("#datatable tbody tr").forEach((tr) => {
      const cells = tr.querySelectorAll("td");
      const linkEl = tr.querySelector("td a");
      const dateText = clean(cells[0]?.innerText || "");
      const dateTime = clean(cells[0]?.querySelector("time")?.getAttribute("datetime") || "");
      let href = clean(linkEl?.getAttribute("href") || "");
      if (href && !href.startsWith("http")) href = "https://www.fda.gov" + href;
      rows.push({
        listDateText: dateText,
        listDateTime: dateTime,
        listBrandName: clean(cells[1]?.innerText || ""),
        listProductDescription: clean(cells[2]?.innerText || ""),
        detailUrl: href,
      });
    });
    return rows;
  });
}

function writeOut(payload) {
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  logOk(`Wrote ${OUT_JSON}`);
}

function cleanText(v) {
  return (v || "").replace(/\s+/g, " ").trim();
}

function slugify(v) {
  return cleanText(v)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function extractYear(dateStr, fallback = String(new Date().getFullYear())) {
  const m = String(dateStr || "").match(/\b(\d{4})\b/);
  return m ? m[1] : fallback;
}

function buildSlugBase({ brandName, companyName, productDescription, year }) {
  const a = slugify(productDescription || "");
  const b = slugify(brandName || companyName || "recall");
  return [a, b, "recall", year].filter(Boolean).join("-");
}

function normalizeDate(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function makeCanonicalUrl(slug) {
  return `${SITE_BASE_URL}${SITE_RECALLS_PATH}/${slug}`;
}

function makeDescription({ brandName, productDescription, reason, year }) {
  const brand = brandName || "This brand";
  const product = productDescription || "a product";
  const why = reason ? ` after issues linked to ${reason}` : "";
  return `${brand} announced a recall involving ${product}${why}. FDA recall notice (${year}).`;
}

async function extractDetailLite(page, detailUrl) {
  const ok = await gotoWithRetry(page, detailUrl, "#main-content");
  if (!ok) return null;

  return page.evaluate(() => {
    const clean = (v) => (v || "").replace(/\s+/g, " ").trim();
    const textOf = (selector) => clean(document.querySelector(selector)?.innerText || "");
    const attrOf = (selector, attr) =>
      clean(document.querySelector(selector)?.getAttribute(attr) || "");

    const title =
      textOf("h1.content-title") ||
      textOf("#main-content h1") ||
      textOf("h1");

    const pageTypeLabel =
      textOf(".field--name-field-page-type .field__item") ||
      textOf(".field--name-field-page-type");

    const disclaimer =
      textOf(".field--name-field-recall-notification-message .field__item") ||
      textOf(".field--name-field-recall-notification-message");

    const companyAnnouncementDate =
      textOf(".field--name-field-company-announcement-date time") ||
      textOf(".field--name-field-company-announcement-date .field__item");
    const companyAnnouncementDateTime =
      attrOf(".field--name-field-company-announcement-date time", "datetime");

    const fdaPublishDate =
      textOf(".field--name-field-date time") ||
      textOf(".field--name-field-date .field__item");
    const fdaPublishDateTime = attrOf(".field--name-field-date time", "datetime");

    const productType = textOf(".field--name-field-product-type .field__item");
    const reason = textOf(".field--name-field-reason-for-recall .field__item");
    const companyName = textOf(".field--name-field-company-name .field__item");
    const brandName = textOf(".field--name-field-brand-name .field__item");
    const productDescription = textOf(".field--name-field-product-description .field__item");

    const contacts = {};
    const consumersBlock = textOf(".field--name-field-recall-audience-consumers");
    const mediaBlock = textOf(".field--name-field-recall-audience-media");
    if (consumersBlock) contacts.consumers = { text: consumersBlock };
    if (mediaBlock) contacts.media = { text: mediaBlock };

    const images = [];
    document.querySelectorAll("#main-content picture img, #main-content .field--name-field-image img").forEach((img) => {
      const src = clean(img.getAttribute("src") || "");
      if (src) images.push(src.startsWith("http") ? src : `https://www.fda.gov${src}`);
    });

    return {
      title,
      pageTypeLabel,
      disclaimer,
      companyAnnouncementDate,
      companyAnnouncementDateTime,
      fdaPublishDate,
      fdaPublishDateTime,
      companyName,
      brandName,
      productDescription,
      productType,
      reason,
      contacts,
      rawImageSources: Array.from(new Set(images)),
    };
  });
}

(async () => {
  const runStart = Date.now();
  header("FDA headless smoke test");
  log(`headless=${HEADLESS}  ·  detail limit=${limit}  ·  delay ${MIN_DELAY_MS}–${MAX_DELAY_MS}ms (random)`);
  console.log("");

  logPhase("Launch Chromium");
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  logOk("Browser started");
  await randomDelay("after browser launch");

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(NAV_TIMEOUT);

  logPhase("Open FDA recalls listing");
  const ok = await gotoWithRetry(page, FDA_LIST_URL, "#datatable");
  if (!ok) {
    logWarn("Could not load FDA listing.");
    writeOut({
      ranAt: new Date().toISOString(),
      error: "Could not load FDA listing",
      fdaListUrl: FDA_LIST_URL,
      limit,
      headless: HEADLESS,
      minDelayMs: MIN_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
    });
    await browser.close();
    process.exit(1);
  }
  logOk("Listing page loaded (#datatable)");
  await randomDelay("after FDA listing load");

  logPhase("Wait for DataTable + set 100/page, Terminated=No");
  await waitForDatatableReady(page);
  await page.selectOption("select.form-control.input-sm", "100");
  await sleep(1000);
  await page.selectOption("#edit-field-terminated-recall", "0");
  await page
    .waitForSelector("#datatable_processing", { state: "visible", timeout: 5000 })
    .catch(() => {});
  await page
    .waitForSelector("#datatable_processing", { state: "hidden", timeout: 10000 })
    .catch(() => {});
  await page.waitForSelector("#datatable tbody tr");
  logOk("Filters applied");
  await randomDelay("after DataTable filters");

  const rows = await extractListRows(page);
  const targets = rows.filter((r) => r.detailUrl).slice(0, limit);

  log(`  ${C.dim}Rows on page 1:${C.reset} ${rows.length}  ${C.dim}·${C.reset}  ${C.dim}detail URLs to fetch:${C.reset} ${targets.length}`);
  console.log("");

  const recalls = [];

  if (targets.length === 0) {
    logWarn("No detail URLs found — skipping detail fetches.");
    await browser.close();
    writeOut({
      ranAt: new Date().toISOString(),
      fdaListUrl: FDA_LIST_URL,
      limit,
      headless: HEADLESS,
      minDelayMs: MIN_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
      elapsedMs: Date.now() - runStart,
      listingRowCount: rows.length,
      listingRowsPage1: rows,
      recalls: [],
    });
    return;
  }

  logPhase(`Fetch detail pages (${targets.length})`);
  for (let i = 0; i < targets.length; i++) {
    const { detailUrl, listDateTime, listProductDescription } = targets[i];
    const short = (listProductDescription || detailUrl || "").slice(0, 52);
    process.stdout.write(
      `\r  ${progressBar(i, targets.length)}  ${i + 1}/${targets.length}  ${C.dim}${short}${C.reset}${" ".repeat(Math.max(0, 54 - short.length))}`
    );

    if (i > 0) await randomDelay(`before detail ${i + 1}/${targets.length}`);

    const detailPage = await context.newPage();
    detailPage.setDefaultNavigationTimeout(NAV_TIMEOUT);
    const t0 = Date.now();
    try {
      const detail = await extractDetailLite(detailPage, detailUrl);
      const ms = Date.now() - t0;
      const navOk = Boolean(detail);
      if (detail) {
        const published =
          normalizeDate(detail.fdaPublishDateTime) ||
          normalizeDate(listDateTime) ||
          normalizeDate(detail.companyAnnouncementDateTime) ||
          "";
        const year = extractYear(published || detail.fdaPublishDate || listDateTime || "");
        const slug = buildSlugBase({
          brandName: detail.brandName || "",
          companyName: detail.companyName || "",
          productDescription: detail.productDescription || listProductDescription || "",
          year,
        }) || `recall-${Date.now()}-${i + 1}`;
        const canonicalUrl = makeCanonicalUrl(slug);
        const imageUrl = detail.rawImageSources[0] || "";

        recalls.push({
          "@context": "https://schema.org",
          "@type": "Article",
          id: slug,
          sortOrder: limit - i,
          canonicalUrl,
          mainEntityOfPage: canonicalUrl,
          headline: detail.title || "",
          datePublished: published || "",
          dateModified: published || "",
          image: imageUrl ? { "@type": "ImageObject", url: imageUrl, caption: detail.title || "" } : undefined,
          description: makeDescription({
            brandName: detail.brandName || detail.companyName || "",
            productDescription: detail.productDescription || listProductDescription || "",
            reason: detail.reason || "",
            year,
          }),
          sourceUrl: detailUrl,
          scrapedAt: new Date().toISOString(),
          pageTypeLabel: detail.pageTypeLabel || "",
          disclaimer: detail.disclaimer || "",
          title: detail.title || "",
          companyAnnouncementDate: detail.companyAnnouncementDate || "",
          companyAnnouncementDateTime: detail.companyAnnouncementDateTime || "",
          fdaPublishDate: detail.fdaPublishDate || "",
          fdaPublishDateTime: detail.fdaPublishDateTime || listDateTime || "",
          companyName: detail.companyName || "",
          brandName: detail.brandName || "",
          brandNames: detail.brandName ? [detail.brandName] : [],
          productDescription: detail.productDescription || listProductDescription || "",
          productType: detail.productType || "",
          regulatedProducts: detail.productType ? [detail.productType] : [],
          reason: detail.reason || "",
          contacts: detail.contacts || {},
          rawImageSources: detail.rawImageSources || [],
          testMeta: { navOk, loadMs: ms },
        });
      }

      console.log(
        `\r  ${progressBar(i + 1, targets.length)}  ${i + 1}/${targets.length}  ` +
          `${navOk ? C.green + "OK" + C.reset : C.red + "FAIL" + C.reset}  ${C.dim}${ms}ms${C.reset}  ${short.slice(0, 40)}`
      );
      if (!navOk) logWarn("#main-content missing or timeout");
    } catch (e) {
      console.log(
        `\r  ${progressBar(i + 1, targets.length)}  ${i + 1}/${targets.length}  ` +
          `${C.red}ERR${C.reset}  ${(e.message || "").slice(0, 50)}`
      );
    } finally {
      await detailPage.close();
    }
  }

  console.log("");
  await randomDelay("before browser close");
  await browser.close();
  logOk("Browser closed");

  const elapsed = Date.now() - runStart;
  const sec = Math.round(elapsed / 1000);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;

  writeOut({
    ranAt: new Date().toISOString(),
    fdaListUrl: FDA_LIST_URL,
    limit,
    headless: HEADLESS,
    minDelayMs: MIN_DELAY_MS,
    maxDelayMs: MAX_DELAY_MS,
    elapsedMs: elapsed,
    elapsedHuman: mm > 0 ? `${mm}m ${ss}s` : `${ss}s`,
    listingRowCount: rows.length,
    attemptedDetails: targets.length,
    recallsExtracted: recalls.length,
    recalls,
  });

  console.log("");
  logPhase("Summary");
  log(`Finished in ${mm > 0 ? `${mm}m ${ss}s` : `${ss}s`}`);
  logOk(`Done — see testing.json for full payload`);
})();
