function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value) {
  if (Array.isArray(value)) return cleanText(value.filter(Boolean).join(" "));
  if (value && typeof value === "object") {
    if (typeof value.text === "string") return cleanText(value.text);
    if (typeof value.Name === "string") return cleanText(value.Name);
    if (typeof value.name === "string") return cleanText(value.name);
    return cleanText(Object.values(value).filter((item) => typeof item === "string").join(" "));
  }
  return stripHtml(value);
}

function compactArray(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function valueArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pluckStrings(items, keys) {
  return compactArray(
    valueArray(items).flatMap((item) => {
      if (typeof item === "string") return [item];
      if (!item || typeof item !== "object") return [];
      return keys.map((key) => item[key]).filter(Boolean);
    })
  );
}

function normalizeName(value) {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : null;
}

function contentText(content) {
  return compactArray(
    valueArray(content).map((section) => {
      if (typeof section === "string") return section;
      if (!section || typeof section !== "object") return "";
      return [section.subtitle, section.text].filter(Boolean).join(". ");
    })
  ).join(" ");
}

function buildCanonicalText(parts) {
  return compactArray(parts).join("\n");
}

function truncate(value, maxLength) {
  const cleaned = cleanText(value);
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}...` : cleaned;
}

module.exports = {
  buildCanonicalText,
  cleanText,
  compactArray,
  contentText,
  firstNonEmpty,
  normalizeName,
  pluckStrings,
  stripHtml,
  truncate,
  valueArray,
};
