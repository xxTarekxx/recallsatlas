const { sha256 } = require("./hash");

function slugify(value, fallback = "recall") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 130);

  return slug || `${fallback}-${sha256(value || fallback).slice(0, 10)}`;
}

function stableSlug(parts, fallback) {
  return slugify(parts.filter(Boolean).join(" "), fallback);
}

module.exports = { slugify, stableSlug };
