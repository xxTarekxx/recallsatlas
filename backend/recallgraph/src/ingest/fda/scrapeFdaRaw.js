"use strict";

const path = require("path");
const { chromium } = require("playwright");
const { parseRawArgs } = require("../shared/args");
const { sourceHash } = require("../shared/sourceHash");
const { writeRunOutput } = require("../shared/writeRunOutput");

const FDA_BASE_URL = "https://www.fda.gov";
const FDA_LIST_URL = `${FDA_BASE_URL}/safety/recalls-market-withdrawals-safety-alerts`;
const NAV_TIMEOUT = 120000;

const recallgraphRoot = path.resolve(__dirname, "../../..");
const latestOutputPath = path.join(recallgraphRoot, "data/raw/fda/fda-raw-latest.json");
const runsRoot = path.join(recallgraphRoot, "data/raw/runs");

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceRecordIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split("/").filter(Boolean).pop() || null;
  } catch {
    return null;
  }
}

function mergeUnique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values || []) {
    const text = cleanText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }
  return output;
}

async function gotoPage(page, url, selector) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      if (selector) await page.waitForSelector(selector, { timeout: NAV_TIMEOUT });
      return true;
    } catch (error) {
      if (attempt === 3) {
        console.warn(`[fda] page load failed: ${url} (${error.message})`);
        return false;
      }
      await page.waitForTimeout(1000 * attempt);
    }
  }
  return false;
}

async function prepareListing(page) {
  await page.waitForSelector("#datatable tbody tr", { timeout: NAV_TIMEOUT });
  await page.selectOption("select.form-control.input-sm", "100").catch(() => {});
  await page.selectOption("#edit-field-terminated-recall", "0").catch(() => {});
  await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: 15000 }).catch(() => {});
  await page.waitForSelector("#datatable tbody tr", { timeout: NAV_TIMEOUT });
}

async function extractListRows(page) {
  return page.evaluate(() => {
    const clean = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return [...document.querySelectorAll("#datatable tbody tr")]
      .map((row) => {
        const cells = row.querySelectorAll("td");
        const link = row.querySelector("a[href]");
        let href = clean(link?.getAttribute("href") || "");
        if (href && href.startsWith("/")) href = `https://www.fda.gov${href}`;

        return {
          listDateText: clean(cells[0]?.innerText || ""),
          listDateTime: clean(cells[0]?.querySelector("time")?.getAttribute("datetime") || ""),
          listBrandName: clean(cells[1]?.innerText || ""),
          listProductDescription: clean(cells[2]?.innerText || ""),
          listProductType: clean(cells[3]?.innerText || ""),
          listReason: clean(cells[4]?.innerText || ""),
          listCompanyName: clean(cells[5]?.innerText || ""),
          listTerminatedRecall: clean(cells[6]?.innerText || ""),
          detailUrl: href,
        };
      })
      .filter((row) => row.detailUrl);
  });
}

async function moveNext(page) {
  const disabled = await page
    .evaluate(() => document.querySelector("#datatable_next")?.classList.contains("disabled") ?? true)
    .catch(() => true);
  if (disabled) return false;

  await page.evaluate(() => document.querySelector("#datatable_next a")?.click()).catch(() => {});
  await page.waitForSelector("#datatable_processing", { state: "hidden", timeout: 15000 }).catch(() => {});
  await page.waitForSelector("#datatable tbody tr", { timeout: NAV_TIMEOUT }).catch(() => {});
  return true;
}

async function extractDetailPage(page, detailUrl) {
  const loaded = await gotoPage(page, detailUrl, "#main-content");
  if (!loaded) return null;

  return page.evaluate(() => {
    const clean = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const absolute = (url) => {
      let value = clean(url);
      if (!value || /^mailto:|^tel:/i.test(value)) return "";
      if (value.startsWith("//")) value = `https:${value}`;
      if (value.startsWith("/")) value = `https://www.fda.gov${value}`;
      try {
        const parsed = new URL(value);
        parsed.hash = "";
        return parsed.toString();
      } catch {
        return "";
      }
    };

    const textOf = (selector) => clean(document.querySelector(selector)?.innerText || "");
    const dtValue = (label) => {
      const found = [...document.querySelectorAll("dt")].find((item) =>
        clean(item.innerText).toLowerCase().includes(label.toLowerCase())
      );
      return clean(found?.nextElementSibling?.innerText || "");
    };
    const dateCell = (selector) => {
      const item = document.querySelector(selector);
      return {
        text: clean(item?.innerText || ""),
        dateTime: clean(item?.querySelector("time")?.getAttribute("datetime") || ""),
      };
    };

    const tableToObject = (table) => {
      const rows = [...table.querySelectorAll("tr")].map((row) =>
        [...row.querySelectorAll("th,td")].map((cell) => clean(cell.innerText))
      );
      const headerIndex = rows.findIndex((row) => row.some(Boolean));
      if (headerIndex < 0) return null;
      const headers = rows[headerIndex].filter(Boolean);
      const bodyRows = rows.slice(headerIndex + 1).filter((row) => row.some(Boolean));
      if (!headers.length || !bodyRows.length) return null;
      return { headers, rows: bodyRows };
    };

    const sourceTables = [];
    const announcementParts = [];
    const announcementHeading = document.querySelector("#recall-announcement");
    if (announcementHeading) {
      let node = announcementHeading.nextElementSibling;
      while (node) {
        if (node.id === "recall-photos") break;
        const text = clean(node.innerText || "");
        if (/company contact information/i.test(text)) break;

        if (["P", "LI"].includes(node.tagName)) {
          if (text) announcementParts.push(text);
        }
        if (node.tagName === "UL" || node.tagName === "OL") {
          [...node.querySelectorAll("li")].forEach((li) => {
            const item = clean(li.innerText || "");
            if (item) announcementParts.push(item);
          });
        }
        if (node.tagName === "TABLE") {
          const table = tableToObject(node);
          if (table) sourceTables.push(table);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll("p,li,table").forEach((child) => {
            if (child.closest("#recall-photos")) return;
            if (child.tagName === "TABLE") {
              const table = tableToObject(child);
              if (table) sourceTables.push(table);
              return;
            }
            const item = clean(child.innerText || "");
            if (item) announcementParts.push(item);
          });
        }
        node = node.nextElementSibling;
      }
    }

    const contacts = [];
    [...document.querySelectorAll("h2")].forEach((heading) => {
      if (!/company contact information/i.test(clean(heading.innerText))) return;
      const section = heading.parentElement;
      if (!section) return;
      [...section.querySelectorAll("dt")].forEach((dt) => {
        const label = clean(dt.innerText).replace(/:$/, "");
        const values = [];
        let node = dt.nextElementSibling;
        while (node && node.tagName && node.tagName.toLowerCase() === "dd") {
          values.push(clean(node.innerText || ""));
          node = node.nextElementSibling;
        }
        const text = values.filter(Boolean).join(" | ");
        const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
        const phones = [...new Set(text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g) || [])];
        const links = [...section.querySelectorAll("a[href]")]
          .map((link) => ({ text: clean(link.innerText || ""), href: absolute(link.getAttribute("href")) }))
          .filter((link) => link.href);
        if (label || text) contacts.push({ label, text, emails, phones, links });
      });
    });

    const rawImageSources = [];
    const images = [];
    [...document.querySelectorAll("#main-content picture, #main-content img")].forEach((item) => {
      const source = item.querySelector?.("source[srcset]") || null;
      const img = item.tagName === "IMG" ? item : item.querySelector?.("img");
      const srcset = clean(source?.getAttribute("srcset") || "");
      const src = absolute((srcset.split(" ")[0] || img?.getAttribute("src") || "").split("?")[0]);
      if (!src || rawImageSources.includes(src)) return;
      rawImageSources.push(src);
      images.push({ url: src, alt: clean(img?.getAttribute("alt") || "") });
    });

    const brandNames = [...document.querySelectorAll(".cell-2_6 .field--item")]
      .map((item) => clean(item.innerText))
      .filter(Boolean);
    const productDescriptions = [...document.querySelectorAll(".cell-2_7 .field--item")]
      .map((item) => clean(item.innerText))
      .filter(Boolean);

    return {
      title: textOf("h1.content-title") || textOf("#main-content h1"),
      pageTypeLabel: textOf(".content-type-label"),
      companyAnnouncementDate: dateCell(".cell-2_1"),
      fdaPublishDate: dateCell(".cell-2_2"),
      productType: textOf(".cell-2_3") || dtValue("Product Type"),
      reason: textOf(".cell-2_4 .field--item") || dtValue("Reason for Announcement"),
      companyName: textOf(".cell-2_5") || dtValue("Company Name"),
      brandNames,
      productDescription: productDescriptions.join(" | "),
      contacts,
      rawImageSources,
      images,
      sourceTables,
      announcementText: [...new Set(announcementParts)].join("\n\n"),
      rawFields: {
        contentCurrentAsOf: textOf(".node-current-date time"),
        contentCurrentAsOfDateTime: clean(document.querySelector(".node-current-date time")?.getAttribute("datetime") || ""),
        disclaimer: textOf("#disclaimer"),
      },
    };
  });
}

function toRawRecord(listRow, detail, scrapedAt) {
  const brandNames = mergeUnique([detail.brandNames?.[0], listRow.listBrandName, ...(detail.brandNames || [])]);
  const sourceUrl = detail.sourceUrl || listRow.detailUrl;
  const companyAnnouncementDate = cleanText(detail.companyAnnouncementDate?.dateTime || detail.companyAnnouncementDate?.text || "");
  const fdaPublishDate = cleanText(detail.fdaPublishDate?.dateTime || detail.fdaPublishDate?.text || listRow.listDateTime || listRow.listDateText || "");

  const record = {
    source: "fda",
    sourceUrl,
    sourceRecordId: sourceRecordIdFromUrl(sourceUrl),
    title: cleanText(detail.title) || null,
    companyName: cleanText(detail.companyName || listRow.listCompanyName) || null,
    brandName: brandNames[0] || null,
    brandNames,
    productDescription: cleanText(detail.productDescription || listRow.listProductDescription) || null,
    productType: cleanText(detail.productType || listRow.listProductType) || null,
    reason: cleanText(detail.reason || listRow.listReason) || null,
    companyAnnouncementDate: companyAnnouncementDate || null,
    fdaPublishDate: fdaPublishDate || null,
    contacts: Array.isArray(detail.contacts) ? detail.contacts : [],
    rawImageSources: Array.isArray(detail.rawImageSources) ? detail.rawImageSources : [],
    images: Array.isArray(detail.images) ? detail.images : [],
    sourceTables: Array.isArray(detail.sourceTables) ? detail.sourceTables : [],
    announcementText: cleanText(detail.announcementText) || null,
    rawFields: {
      ...detail.rawFields,
      listRow,
      pageTypeLabel: cleanText(detail.pageTypeLabel),
      terminatedRecall: cleanText(listRow.listTerminatedRecall),
    },
    scrapedAt,
  };

  return { ...record, sourceHash: sourceHash(record) };
}

async function collectCandidates(page, limit) {
  const candidates = [];
  let pageIndex = 1;

  while (candidates.length < limit) {
    const rows = await extractListRows(page);
    for (const row of rows) {
      if (candidates.length >= limit) break;
      candidates.push(row);
    }
    if (candidates.length >= limit) break;
    const moved = await moveNext(page);
    if (!moved) break;
    pageIndex += 1;
    if (pageIndex > 100) break;
  }

  return candidates;
}

async function scrapeFdaRaw(options = {}) {
  const args = { ...parseRawArgs({ limit: 100 }), ...options };
  const startedAt = new Date().toISOString();
  const scrapedAt = new Date().toISOString();
  const errors = [];
  const records = [];

  console.log(`[fda] Raw ingest starting. limit=${args.limit} dryRun=${args.dryRun ? "yes" : "no"}`);

  const browser = await chromium.launch({
    headless: process.env.HEADLESS === "false" ? false : true,
    slowMo: process.env.HEADLESS === "false" ? 150 : 0,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: "RecallsAtlas/1.0 (+https://recallsatlas.com)",
      locale: "en-US",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    const opened = await gotoPage(page, FDA_LIST_URL, "#datatable");
    if (!opened) throw new Error("FDA list page did not load.");
    await prepareListing(page);

    const candidates = await collectCandidates(page, args.limit);
    console.log(`[fda] Detail pages queued: ${candidates.length}`);

    for (let index = 0; index < candidates.length; index += 1) {
      const listRow = candidates[index];
      const detailPage = await context.newPage();
      detailPage.setDefaultTimeout(NAV_TIMEOUT);
      detailPage.setDefaultNavigationTimeout(NAV_TIMEOUT);

      try {
        console.log(`[fda] ${index + 1}/${candidates.length} ${listRow.detailUrl}`);
        const detail = await extractDetailPage(detailPage, listRow.detailUrl);
        if (!detail) throw new Error("No detail fields returned.");
        records.push(toRawRecord(listRow, { ...detail, sourceUrl: listRow.detailUrl }, scrapedAt));
      } catch (error) {
        errors.push({ sourceUrl: listRow.detailUrl, message: error.message });
        console.warn(`[fda] skipped one detail page: ${error.message}`);
      } finally {
        await detailPage.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const output = writeRunOutput({
    source: "fda",
    latestPath: latestOutputPath,
    customPath: args.out,
    runRoot: runsRoot,
    records,
    errors,
    startedAt,
    dryRun: args.dryRun,
  });

  console.log(`[fda] Raw ingest complete. records=${records.length} errors=${errors.length}`);
  if (args.dryRun) console.log("[fda] Dry run: no files written.");
  else output.outputFiles.forEach((file) => console.log(`[fda] wrote ${file}`));

  return output;
}

if (require.main === module) {
  scrapeFdaRaw().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { scrapeFdaRaw };
