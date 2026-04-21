"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PIPELINE_ROOT = path.join(__dirname, "..", "..");
const DATA_ROOT = path.join(PIPELINE_ROOT, "data");
const LOGS_ROOT = path.join(DATA_ROOT, "logs");
const BACKEND_ROOT = path.join(PIPELINE_ROOT, "..");
const ENV_ROOT = path.join(BACKEND_ROOT, "scripts");

require("dotenv").config({
  path: fs.existsSync(path.join(ENV_ROOT, ".env"))
    ? path.join(ENV_ROOT, ".env")
    : path.join(BACKEND_ROOT, ".env"),
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_ENGLISH_BACKFILL_MODEL || "gpt-4.1-mini";

const INPUT_PATH = path.join(DATA_ROOT, "recalls.json");
const OUTPUT_PATH_DEFAULT = path.join(DATA_ROOT, "recalls.english.cleaned.json");
const HASH_PATH_DEFAULT = path.join(LOGS_ROOT, "backfillEnglishRecallStructure.hashes.json");
const LOG_PATH_DEFAULT = path.join(LOGS_ROOT, "backfillEnglishRecallStructure.run-log.json");

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

function parseArgs() {
  const flags = process.argv.slice(2);
  const out = {
    input: INPUT_PATH,
    output: OUTPUT_PATH_DEFAULT,
    hashFile: HASH_PATH_DEFAULT,
    logFile: LOG_PATH_DEFAULT,
    slug: null,
    limit: null,
    resume: flags.includes("--resume"),
  };
  for (const flag of flags) {
    if (flag.startsWith("--input=")) out.input = path.resolve(flag.slice(8));
    if (flag.startsWith("--output=")) out.output = path.resolve(flag.slice(9));
    if (flag.startsWith("--hashfile=")) out.hashFile = path.resolve(flag.slice(11));
    if (flag.startsWith("--logfile=")) out.logFile = path.resolve(flag.slice(10));
    if (flag.startsWith("--slug=")) out.slug = flag.slice(7).trim();
    if (flag.startsWith("--limit=")) out.limit = Number(flag.slice(8));
  }
  return out;
}

function fmtElapsed(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

function progressBar(current, total, width = 26) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(current, safeTotal) / safeTotal;
  const filled = Math.round(ratio * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pct = String(Math.round(ratio * 100)).padStart(3);
  return `[${bar}] ${pct}%`;
}

function uiHeader(title) {
  const line = "═".repeat(58);
  console.log(`\n${C.cyan}${C.bold}  ${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${line}${C.reset}\n`);
}

function uiInfo(label, value) {
  const lPad = String(label).padEnd(22);
  console.log(`     ${C.dim}${lPad}${C.reset}${value}`);
}

function printTotals(totals) {
  console.log(
    `  ${C.dim}totals:${C.reset} processed=${totals.processed} | saved=${totals.saved} | skipped=${totals.skipped} | failed=${totals.failed}`
  );
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Expected JSON array in ${filePath}`);
  return parsed;
}

function readJsonObject(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return normalizeWhitespace(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
  );
}

function cleanText(value) {
  return normalizeWhitespace(value);
}

function firstSentence(text, maxLen = 220) {
  const t = normalizeWhitespace(text);
  if (!t) return "";
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  const sentence = normalizeWhitespace(m ? m[0] : t);
  if (sentence.length <= maxLen) return sentence;
  return `${sentence.slice(0, maxLen - 1).trimEnd()}…`;
}

function uniqueArray(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function makeSeoHeadline(recall) {
  const current = cleanText(recall?.headline || "");
  if (current && !/^product recall$/i.test(current)) return current;
  const title = cleanText(recall?.title || "");
  if (title && !/^product recall$/i.test(title)) return title;
  const entity = cleanText(recall?.brandName || recall?.companyName || "");
  const product = cleanText(recall?.productDescription || "Product");
  const reason = cleanText(recall?.reason || "a safety issue");
  if (entity) return cleanText(`${entity} Recalls ${product} Over ${reason}`);
  return cleanText(`Recall: ${product} Due to ${reason}`);
}

function makeSeoTitle(recall, headlineOverride = "") {
  const current = cleanText(recall?.title || "");
  if (current && !/^product recall$/i.test(current)) return current;
  return cleanText(headlineOverride || makeSeoHeadline(recall));
}

function makeDescription(recall) {
  const entity = cleanText(recall?.brandName || recall?.companyName || "A company");
  const product = cleanText(recall?.productDescription || "a product");
  const reason = cleanText(recall?.reason || "");
  const year = String(recall?.datePublished || recall?.fdaPublishDate || "").slice(0, 4) || "this year";
  let text = `${entity} announced a recall involving ${product}`;
  if (reason) text += ` after issues linked to ${reason.toLowerCase()}`;
  text += `. FDA recall notice published in ${year}.`;
  text = cleanText(text);
  if (text.length > 160) text = `${text.slice(0, 157).replace(/\s+\S*$/, "")}...`;
  return text;
}

function findSection(content, patterns) {
  const sections = Array.isArray(content) ? content : [];
  return sections.find((section) => {
    const subtitle = cleanText(section?.subtitle || "").toLowerCase();
    return patterns.some((pattern) => pattern.test(subtitle));
  });
}

function deriveExistingTexts(recall) {
  const content = Array.isArray(recall?.content) ? recall.content : [];
  const summary = findSection(content, [/^recall summary$/, /^summary$/]);
  const action = findSection(content, [/what consumers should do/i, /what you should do/i]);
  const source = findSection(content, [/official source/i, /source and verification/i]);
  const about = findSection(content, [/about the company/i]);
  const facts = findSection(content, [/what was recalled/i]);
  return {
    summarySection: summary || null,
    actionSection: action || null,
    sourceSection: source || null,
    factsSection: facts || null,
    summaryHtml: String(summary?.text || ""),
    summaryText: stripHtml(summary?.text || ""),
    actionText: stripHtml(action?.text || ""),
    sourceText: stripHtml(source?.text || ""),
    aboutText: stripHtml(about?.text || ""),
  };
}

function deriveInjuryContext(recall, existing) {
  const haystack = [
    cleanText(recall?.reason || ""),
    cleanText(recall?.description || ""),
    cleanText(existing?.summaryText || ""),
    cleanText(existing?.sourceText || ""),
  ].join(" ");

  const noInjuryMatch = haystack.match(
    /\b(no (?:injur(?:y|ies)|adverse events?|incidents?) (?:have been )?(?:reported|report(?:ed)? to date)|no reported injuries|no adverse events have been reported)\b/i
  );
  if (noInjuryMatch) {
    return "No injuries or adverse events have been reported in the source material.";
  }

  const yesInjuryMatch = haystack.match(
    /\b(injur(?:y|ies)|adverse events?|hospitali[sz]ation|death|serious complications?|infection|burns?)\b/i
  );
  if (yesInjuryMatch) {
    return "The source material references possible or reported injuries, adverse events, or serious health complications.";
  }

  return "The source material does not clearly state whether injuries or adverse events were reported.";
}

function buildContactSectionText(contacts) {
  const parts = [];
  if (contacts?.consumers?.organization || contacts?.consumers?.phone || contacts?.consumers?.email) {
    parts.push(
      cleanText(
        `Consumer support: ${[
          contacts.consumers.organization,
          contacts.consumers.phone,
          contacts.consumers.email,
        ].filter(Boolean).join(" | ")}`
      )
    );
  }
  if (contacts?.media?.name || contacts?.media?.role || contacts?.media?.email || contacts?.media?.phone) {
    parts.push(
      cleanText(
        `Media contact: ${[
          contacts.media.name,
          contacts.media.role,
          contacts.media.email,
          contacts.media.phone,
        ].filter(Boolean).join(" | ")}`
      )
    );
  }
  return parts.filter(Boolean).join("\n");
}

function buildAuthorityLinks(recall) {
  const links = [];
  const companyWebsite = cleanText(recall?.companyWebsite || "");
  const consumerWebsite = cleanText(recall?.consumerWebsite || "");
  const lotCheckUrl = cleanText(recall?.lotCheckUrl || "");
  const isMarketplaceUrl = (url) => /amazon\.com|walmart\.com|ebay\.com|target\.com/i.test(url);

  if (recall?.sourceUrl) {
    links.push(
      `Read the official FDA recall notice <a href='${recall.sourceUrl}' target='_blank' rel='noopener noreferrer'>on the FDA website</a>.`
    );
  }
  if (lotCheckUrl) {
    links.push(
      `Check lot or replacement information <a href='${lotCheckUrl}' target='_blank' rel='noopener noreferrer'>on the company support page</a>.`
    );
  }
  if (consumerWebsite && !isMarketplaceUrl(consumerWebsite)) {
    links.push(
      `Review consumer support information <a href='${consumerWebsite}' target='_blank' rel='noopener noreferrer'>on the company website</a>.`
    );
  }
  if (
    companyWebsite &&
    !isMarketplaceUrl(companyWebsite) &&
    companyWebsite !== consumerWebsite &&
    companyWebsite !== lotCheckUrl
  ) {
    links.push(
      `Visit the company website <a href='${companyWebsite}' target='_blank' rel='noopener noreferrer'>for product details</a>.`
    );
  }
  return uniqueArray(links);
}

function buildFactsSection(recall) {
  const facts = {
    company: cleanText(recall?.companyName || ""),
    brand: cleanText(recall?.brandName || ""),
    product: cleanText(recall?.productDescription || ""),
    productType: cleanText(recall?.productType || ""),
    reason: cleanText(recall?.reason || ""),
  };
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value));
}

function buildSourceText(recall) {
  const published = cleanText(recall?.fdaPublishDate || recall?.datePublished || "");
  if (published) {
    return `According to the U.S. Food and Drug Administration (FDA), this recall notice was published on ${published}.`;
  }
  return "This summary references the official FDA recall notice linked in this record.";
}

function buildFallbackSummary(recall) {
  const entity = cleanText(recall?.brandName || recall?.companyName || "The company");
  const product = cleanText(recall?.productDescription || "the product");
  const reason = cleanText(recall?.reason || "");
  let text = `${entity} announced a recall involving ${product}.`;
  if (reason) text += ` The recall notice said the issue was ${reason}.`;
  return cleanText(text);
}

function buildFallbackAction(recall, existing) {
  if (existing?.actionText) return firstSentence(existing.actionText, 260);
  const parts = [];
  if (recall?.lotCheckUrl) parts.push("Check the product details or lot information to see whether your item is affected.");
  parts.push("Stop using the product and follow the official recall instructions if you have the affected item.");
  if (recall?.contacts?.consumers?.phone || recall?.contacts?.consumers?.email) {
    parts.push("Contact the company using the support details in this recall if you need help.");
  }
  return cleanText(parts.join(" "));
}

function stripCodeFences(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function buildSourceHash(recall) {
  const payload = {
    slug: recall?.slug || "",
    title: recall?.title || "",
    headline: recall?.headline || "",
    description: recall?.description || "",
    companyName: recall?.companyName || "",
    brandName: recall?.brandName || "",
    productDescription: recall?.productDescription || "",
    productType: recall?.productType || "",
    reason: recall?.reason || "",
    sourceUrl: recall?.sourceUrl || "",
    content: Array.isArray(recall?.content)
      ? recall.content.map((section) => ({
          subtitle: section?.subtitle || "",
          text: stripHtml(section?.text || ""),
          facts: section?.facts || {},
        }))
      : [],
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isWeakDescription(value) {
  const text = cleanText(value);
  return !text || /^fda recall notice/i.test(text) || text.length < 70;
}

async function callOpenAIJson(prompt) {
  if (!OPENAI_API_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: prompt }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = stripCodeFences(data.output?.[0]?.content?.[0]?.text || data.output_text || "");
    return JSON.parse(text);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function optimizeEnglishRecall(recall) {
  const existing = deriveExistingTexts(recall);
  const injuryContext = deriveInjuryContext(recall, existing);
  const fallbackHeadline = makeSeoHeadline(recall);
  const fallback = {
    headline: fallbackHeadline,
    title: makeSeoTitle(recall, fallbackHeadline),
    description: isWeakDescription(recall?.description) ? makeDescription(recall) : cleanText(recall.description),
    recallSummaryHtml: existing.summaryHtml || `<p>${buildFallbackSummary(recall)}</p>`,
    actionText: buildFallbackAction(recall, existing),
  };

  const prompt = `
You are improving the English content structure of a public recall page for SEO and E-E-A-T quality.

Return strict JSON only with these keys:
- title
- headline
- description
- recallSummaryHtml
- actionText

Rules:
- Keep the tone factual, safety-oriented, and concise.
- Do not invent facts, injuries, dates, products, quantities, or instructions.
- Title and headline must be descriptive and must not be generic like "Product Recall".
- Headline must be descriptive and must not be generic like "Product Recall".
- Description should be a concise SEO meta description, around 140-160 characters when possible.
- recallSummaryHtml must be valid HTML only.
- Preserve the existing HTML structure as much as possible.
- Preserve any existing HTML <table>, rows, columns, product facts, dates, numbers, and product details.
- Do not simplify or paraphrase table values.
- A separate "What You Should Do" section will exist, so recallSummaryHtml must NOT contain duplicated consumer-action instructions.
- Remove action paragraphs such as stop use, disposal, returns, contacting the company, or reporting steps from recallSummaryHtml when they overlap with the action section.
- Remove action <ul> or <ol> lists from recallSummaryHtml when they are step-by-step consumer instructions.
- Keep factual recall context, affected products, dates, injuries, and tables in recallSummaryHtml.
- If the source supports an injuries/adverse-events statement, keep or add one short factual sentence about that in recallSummaryHtml.
- If the source says no injuries or incidents were reported, preserve that clearly.
- Do not rewrite good factual summary paragraphs unless needed for deduplication or clarity.
- actionText must be one short paragraph for a single "What You Should Do" section.
- actionText must give concrete, source-supported actions.
- Prefer explicit actions already present in the source such as stop use, check affected lots, dispose, return, contact support, or send verification materials.
- Do not replace specific steps with vague wording like "follow official guidance" or "handle the product appropriately".
- If the source includes a disposal, return, refund, photo, email, or contact step, preserve it clearly in actionText.
- Do not include repeated source-link phrases like "FDA recall page here".
- Do not include markdown, notes, or explanation.

Context:
Slug: ${recall.slug || ""}
Current title: ${recall.title || ""}
Current headline: ${recall.headline || ""}
Current description: ${recall.description || ""}
Company: ${recall.companyName || ""}
Brand: ${recall.brandName || ""}
Product: ${recall.productDescription || ""}
Product type: ${recall.productType || ""}
Reason: ${recall.reason || ""}
Source URL: ${recall.sourceUrl || ""}
Existing recall summary HTML: ${existing.summaryHtml || ""}
Existing recall summary text: ${existing.summaryText || ""}
Existing action text: ${existing.actionText || ""}
Existing source text: ${existing.sourceText || ""}
About company text: ${existing.aboutText || ""}
Injury/adverse-event context: ${injuryContext}
Fallback title: ${fallback.title}
Fallback headline: ${fallback.headline}
Fallback description: ${fallback.description}
Fallback action: ${fallback.actionText}
`.trim();

  const model = await callOpenAIJson(prompt);
  if (!model || typeof model !== "object") return fallback;

  return {
    title: cleanText(model.title || fallback.title) || fallback.title,
    headline: cleanText(model.headline || fallback.headline) || fallback.headline,
    description: cleanText(model.description || fallback.description) || fallback.description,
    recallSummaryHtml: String(model.recallSummaryHtml || fallback.recallSummaryHtml).trim() || fallback.recallSummaryHtml,
    actionText: cleanText(model.actionText || fallback.actionText) || fallback.actionText,
  };
}

function buildCleanSections(recall, optimized) {
  const existing = deriveExistingTexts(recall);
  const sections = [];
  sections.push({
    subtitle: "Recall Summary",
    text: optimized.recallSummaryHtml,
  });

  const facts = existing.factsSection?.facts && typeof existing.factsSection.facts === "object"
    ? existing.factsSection.facts
    : buildFactsSection(recall);
  if (Object.keys(facts).length) {
    sections.push({
      subtitle: "What Was Recalled",
      facts,
    });
  }

  if (optimized.actionText) {
    sections.push({
      subtitle: "What You Should Do",
      text: optimized.actionText,
    });
  }

  const contactText = buildContactSectionText(recall?.contacts);
  if (contactText) {
    sections.push({
      subtitle: "Company Contact Information",
      text: contactText,
    });
  }

  if (existing.aboutText) {
    sections.push({
      subtitle: "About the Company",
      text: existing.aboutText,
    });
  }

  sections.push({
    subtitle: "Source and Verification",
    text: buildSourceText(recall),
    authorityLinks: buildAuthorityLinks(recall),
  });

  return sections.filter((section) =>
    cleanText(section?.text || "") ||
    (section?.facts && Object.keys(section.facts).length) ||
    (Array.isArray(section?.authorityLinks) && section.authorityLinks.length)
  );
}

function applyEnglishBackfill(recall, optimized) {
  const next = JSON.parse(JSON.stringify(recall));
  next.title = optimized.title;
  next.headline = optimized.headline;
  next.description = optimized.description;
  next.content = buildCleanSections(next, optimized);
  const enOnly = {
    ...((next.languages && next.languages.en) || {}),
    title: next.title || "",
    headline: next.headline || "",
    description: next.description || "",
    productDescription: next.productDescription || "",
    productType: next.productType || "",
    reason: next.reason || "",
    disclaimer: next.disclaimer || "",
    pageTypeLabel: next.pageTypeLabel || "",
    label: next.label || "",
    regulatedProducts: typeof next.regulatedProducts === "string"
      ? next.regulatedProducts
      : Array.isArray(next.regulatedProducts)
        ? next.regulatedProducts.join(", ")
        : "",
    content: next.content,
    dir: "ltr",
    flag: "🇺🇸",
    lang: "en",
  };
  next.languages = { en: enOnly };
  return next;
}

async function main() {
  const args = parseArgs();
  let recalls = readJsonArray(args.input);
  if (args.slug) recalls = recalls.filter((recall) => recall.slug === args.slug);
  if (Number.isFinite(args.limit) && args.limit > 0) recalls = recalls.slice(0, Math.floor(args.limit));

  const existingOutput = args.resume ? readJsonArray(args.output) : [];
  const outputBySlug = new Map(existingOutput.map((recall) => [recall.slug || recall.id, recall]));
  const hashes = readJsonObject(args.hashFile);
  const runLog = {
    startedAt: new Date().toISOString(),
    successes: [],
    failures: [],
  };

  uiHeader("English Recall Cleanup");
  uiInfo("English input", args.input);
  uiInfo("English output", args.output);
  uiInfo("Hash file", args.hashFile);
  uiInfo("Run log", args.logFile);
  uiInfo("Records", String(recalls.length));
  if (args.slug) uiInfo("Slug filter", args.slug);
  if (args.limit) uiInfo("Limit", String(args.limit));
  console.log("");

  const out = [];
  const totals = { processed: 0, saved: 0, skipped: 0, failed: 0 };
  const startedAt = Date.now();
  const timings = [];
  for (const recall of recalls) {
    const itemStart = Date.now();
    const slug = recall.slug || recall.id;
    const sourceHash = buildSourceHash(recall);
    const already = outputBySlug.get(slug);
    console.log(`${C.bold}[${totals.processed + 1}/${recalls.length}]${C.reset} ${slug}`);
    if (args.resume && already && hashes[slug] === sourceHash) {
      out.push(already);
      totals.processed++;
      totals.skipped++;
      timings.push(Date.now() - itemStart);
      console.log(`  ${C.yellow}skip${C.reset}: hash unchanged`);
      printTotals(totals);
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const remaining = recalls.length - totals.processed;
      console.log(`  ${C.dim}${progressBar(totals.processed, recalls.length)}  elapsed ${fmtElapsed(Date.now() - startedAt)}  eta ${remaining > 0 ? fmtElapsed(avg * remaining) : "0s"}${C.reset}\n`);
      continue;
    }

    try {
      const optimized = await optimizeEnglishRecall(recall);
      const cleaned = applyEnglishBackfill(recall, optimized);
      out.push(cleaned);
      hashes[slug] = sourceHash;
      runLog.successes.push({ slug });
      writeJson(args.output, out);
      writeJson(args.hashFile, hashes);
      totals.processed++;
      totals.saved++;
      timings.push(Date.now() - itemStart);
      console.log(`  ${C.green}saved${C.reset}: ${slug}`);
    } catch (error) {
      out.push(already || recall);
      runLog.failures.push({ slug, reason: error.message || String(error) });
      writeJson(args.output, out);
      writeJson(args.hashFile, hashes);
      totals.processed++;
      totals.failed++;
      timings.push(Date.now() - itemStart);
      console.log(`  ${C.red}failed${C.reset}: ${error.message || String(error)}`);
    }
    printTotals(totals);
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const remaining = recalls.length - totals.processed;
    console.log(`  ${C.dim}${progressBar(totals.processed, recalls.length)}  elapsed ${fmtElapsed(Date.now() - startedAt)}  eta ${remaining > 0 ? fmtElapsed(avg * remaining) : "0s"}${C.reset}\n`);
  }

  runLog.finishedAt = new Date().toISOString();
  runLog.summary = totals;
  writeJson(args.logFile, runLog);
  uiHeader("English Cleanup Complete");
  uiInfo("Written recalls", String(out.length));
  uiInfo("Saved", String(totals.saved));
  uiInfo("Skipped", String(totals.skipped));
  uiInfo("Failed", String(totals.failed));
  uiInfo("Total time", fmtElapsed(Date.now() - startedAt));
  uiInfo("Run log", args.logFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
