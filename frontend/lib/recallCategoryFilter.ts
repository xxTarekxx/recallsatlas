/**
 * FDA browse categories (filter bar slugs) -> MongoDB filters on normalized `browseCategory`.
 */

export const VALID_CATEGORY_SLUGS = [
  "drugs",
  "food",
  "medical-devices",
  "supplements",
] as const;

export type RecallCategorySlug = (typeof VALID_CATEGORY_SLUGS)[number];

export function isValidCategorySlug(s: string): s is RecallCategorySlug {
  return (VALID_CATEGORY_SLUGS as readonly string[]).includes(s);
}

/** Mongo filter for one browse category, or null if slug is invalid. */
export function categorySlugToMongoFilter(
  slug: string | null | undefined
): Record<string, unknown> | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  if (!isValidCategorySlug(key)) return null;
  return { browseCategory: key };
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type BuildQueryOpts = { q?: string; category?: string | null };

/** Full list query: optional text search + optional category (AND). */
export function buildRecallsListQuery(opts: BuildQueryOpts): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [];
  const cat = categorySlugToMongoFilter(opts.category ?? null);
  if (cat) parts.push(cat);

  const q = (opts.q || "").trim();
  if (q.length > 0) {
    const esc = escapeRegex(q);
    parts.push({
      $or: [
        { headline: { $regex: esc, $options: "i" } },
        { title: { $regex: esc, $options: "i" } },
        { productType: { $regex: esc, $options: "i" } },
        { productDescription: { $regex: esc, $options: "i" } },
        { slug: { $regex: esc, $options: "i" } },
      ],
    });
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}
