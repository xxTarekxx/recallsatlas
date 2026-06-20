const { hashJson } = require("../lib/hash");
const { normalizeDate } = require("../lib/date");
const { slugify, stableSlug } = require("../lib/slug");
const {
  buildCanonicalText,
  cleanText,
  compactArray,
  contentText,
  firstNonEmpty,
  normalizeName,
  pluckStrings,
  valueArray,
} = require("../lib/text");

function firstParty(record) {
  return firstNonEmpty(
    ...pluckStrings(record.Manufacturers, ["Name", "CompanyName", "name"]),
    ...pluckStrings(record.Importers, ["Name", "CompanyName", "name"]),
    ...pluckStrings(record.Distributors, ["Name", "CompanyName", "name"]),
    ...pluckStrings(record.Retailers, ["Name", "CompanyName", "name"])
  );
}

function normalizeCpscImages(record) {
  const images = [];
  for (const item of valueArray(record.Images)) {
    if (typeof item === "string") {
      images.push({ url: item, source: "Images" });
    } else if (item && typeof item === "object") {
      const url = item.URL || item.Url || item.url || item.SourceImageURL;
      if (url) {
        images.push({
          url: cleanText(url),
          alt: cleanText(item.Caption || item.caption || item.Name),
          source: item.SourceImageURL ? "Images.SourceImageURL" : "Images",
        });
      }
    }
  }

  if (record.image && typeof record.image === "object" && record.image.url) {
    images.push({ url: cleanText(record.image.url), alt: cleanText(record.image.caption), source: "image" });
  }

  const seen = new Set();
  return images.filter((image) => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function normalizeGeneralRecall(record, normalizedAt) {
  const rawHash = hashJson(record);
  const sourceRecordId = firstNonEmpty(record.sourceRecordId, record.RecallID, record.RecallNumber, record.id, record.sourceHash);
  const products = pluckStrings(record.Products, ["Name", "Description", "Model", "Type"]);
  const productName = firstNonEmpty(...pluckStrings(record.Products, ["Name"]));
  const productDescription = firstNonEmpty(...products);
  const companyName = firstParty(record);
  const hazards = compactArray([
    ...pluckStrings(record.Hazards, ["Name", "Description"]),
    record.hazard,
    record.reason,
  ]);
  const remedy = firstNonEmpty(...pluckStrings(record.Remedies, ["Name", "Description"]), record.remedy);
  const consumerAction = firstNonEmpty(remedy, ...pluckStrings(record.RemedyOptions, ["Name", "Option"]));
  const title = firstNonEmpty(record.headline, record.Title, record.title, record.Description);
  const description = firstNonEmpty(record.Description, record.description, contentText(record.content), title);
  const recallDate = normalizeDate(record.RecallDate);
  const publishedAt = normalizeDate(record.sourcePublishedAt || record.datePublished || record.LastPublishDate || record.RecallDate);
  const category = firstNonEmpty(record.primaryCategorySlug, ...valueArray(record.categorySlugs), record.category);
  const productType = firstNonEmpty(...pluckStrings(record.Products, ["Type", "Category"]), category);
  const slug = record.slug ? slugify(record.slug) : stableSlug([title, record.RecallNumber, record.RecallDate], "cpsc-recall");

  const canonicalTextForEmbedding = buildCanonicalText([
    title,
    `Source: CPSC`,
    companyName && `Company: ${companyName}`,
    productName && `Product: ${productName}`,
    productType && `Product type: ${productType}`,
    hazards.length ? `Hazards: ${hazards.join("; ")}` : "",
    remedy && `Remedy: ${remedy}`,
    consumerAction && `Consumer action: ${consumerAction}`,
    description,
  ]);

  return {
    id: `cpsc_${(sourceRecordId || rawHash).replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 90)}`,
    source: "cpsc",
    sourceRecordId,
    sourceUrl: firstNonEmpty(record.URL, record.sourceUrl, record.canonicalUrl) || "",
    slug,
    title: title || "Untitled product recall",
    description: description || "",
    recallDate,
    publishedAt,
    companyName,
    normalizedCompanyName: normalizeName(companyName),
    brandName: firstNonEmpty(record.brandName, companyName),
    productName,
    productDescription,
    productType,
    category,
    hazards,
    remedy,
    consumerAction,
    images: normalizeCpscImages(record),
    rawHash,
    canonicalTextForEmbedding,
    normalizedAt,
    rawRecord: record,
  };
}

module.exports = { normalizeGeneralRecall };
