const { hashJson } = require("../lib/hash");
const { dateOnly, normalizeDate } = require("../lib/date");
const { slugify, stableSlug } = require("../lib/slug");
const {
  buildCanonicalText,
  cleanText,
  compactArray,
  contentText,
  firstNonEmpty,
  normalizeName,
  valueArray,
} = require("../lib/text");

function deriveFdaCategory(record) {
  const haystack = [
    record.productType,
    record.regulatedProducts,
    record.keywords,
    record.title,
    record.headline,
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("pet food") || haystack.includes("animal")) return "pet-food";
  if (haystack.includes("device")) return "medical-devices";
  if (haystack.includes("drug")) return "drugs";
  if (haystack.includes("supplement")) return "supplements";
  if (haystack.includes("food") || haystack.includes("allergen")) return "food";
  return cleanText(record.productType || "fda");
}

function normalizeFdaImages(record) {
  const images = [];
  for (const item of valueArray(record.images)) {
    if (typeof item === "string") {
      images.push({ url: item, source: "images" });
    } else if (item && typeof item === "object") {
      const url = item.url || item.URL || item.src;
      if (url) images.push({ url: cleanText(url), alt: cleanText(item.caption || item.alt), source: "images" });
    }
  }

  if (record.image && typeof record.image === "object" && record.image.url) {
    images.push({
      url: cleanText(record.image.url),
      alt: cleanText(record.image.caption),
      source: "image",
    });
  }

  for (const item of valueArray(record.rawImageSources)) {
    const url = typeof item === "string" ? item : item && (item.url || item.src || item.SourceImageURL);
    if (url) images.push({ url: cleanText(url), source: "rawImageSources" });
  }

  const seen = new Set();
  return images.filter((image) => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function normalizeFdaRecall(record, normalizedAt) {
  const rawHash = hashJson(record);
  const sourceRecordId = firstNonEmpty(record.id, record._id, record.sourceUrl, record.canonicalUrl);
  const title = firstNonEmpty(record.headline, record.title, record.subtitle, record.description, record.productDescription);
  const description = firstNonEmpty(record.description, contentText(record.content), record.reason);
  const companyName = firstNonEmpty(record.companyName);
  const brandName = firstNonEmpty(record.brandName, ...valueArray(record.brandNames));
  const productDescription = firstNonEmpty(record.productDescription, record.label, record.productName);
  const productName = firstNonEmpty(record.productName, productDescription, brandName);
  const productType = firstNonEmpty(record.productType, ...valueArray(record.regulatedProducts));
  const hazards = compactArray([record.reason, record.hazard, record.classification]);
  const remedy = firstNonEmpty(record.remedy, record.consumerAction);
  const consumerAction = firstNonEmpty(record.consumerAction, remedy);
  const recallDate = normalizeDate(record.companyAnnouncementDateTime || record.companyAnnouncementDate || record.fdaPublishDateTime || record.fdaPublishDate);
  const publishedAt = normalizeDate(record.sourcePublishedAt || record.datePublished || record.fdaPublishDateTime || record.fdaPublishDate);
  const slug = record.slug ? slugify(record.slug) : stableSlug([title, brandName, dateOnly(recallDate || publishedAt)], "fda-recall");

  const canonicalTextForEmbedding = buildCanonicalText([
    title,
    `Source: FDA`,
    companyName && `Company: ${companyName}`,
    brandName && `Brand: ${brandName}`,
    productName && `Product: ${productName}`,
    productType && `Product type: ${productType}`,
    hazards.length ? `Hazard or reason: ${hazards.join("; ")}` : "",
    remedy && `Remedy: ${remedy}`,
    consumerAction && `Consumer action: ${consumerAction}`,
    description,
  ]);

  return {
    id: `fda_${(sourceRecordId || rawHash).replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 90)}`,
    source: "fda",
    sourceRecordId,
    sourceUrl: firstNonEmpty(record.sourceUrl, record.URL, record.canonicalUrl) || "",
    slug,
    title: title || "Untitled FDA recall",
    description: description || "",
    recallDate,
    publishedAt,
    companyName,
    normalizedCompanyName: normalizeName(companyName),
    brandName,
    productName,
    productDescription,
    productType,
    category: deriveFdaCategory(record),
    hazards,
    remedy,
    consumerAction,
    images: normalizeFdaImages(record),
    rawHash,
    canonicalTextForEmbedding,
    normalizedAt,
    rawRecord: record,
  };
}

module.exports = { normalizeFdaRecall };
