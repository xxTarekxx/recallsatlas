/**
 * Short product name for display (H1, cards, image alt).
 * FDA product_description is often a long string; we take the first segment
 * and cap length for SEO and readability.
 */
export function getShortProductName(product, maxLen = 50) {
  if (!product || typeof product !== "string") return "Product";
  const t = product.trim();
  const segment = t
    .split(/\s*,\s*Manufactured|\s*,\s*Distributed|\.\s+NDC\s/i)[0]
    ?.trim() || t;
  const out = segment.length <= maxLen ? segment : segment.slice(0, maxLen).trim() + "…";
  return out || "Product";
}

export function getShortRecallTitle(product, year, maxProductLen = 50) {
  const short = getShortProductName(product, maxProductLen);
  return year ? `${short} Recall (${year})` : `${short} Recall`;
}
