import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import { getDb } from "@/lib/mongodb";
import { buildRecallsListQuery, isValidCategorySlug } from "@/lib/recallCategoryFilter";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

/**
 * Only the fields RecallCard needs for the list view.
 * Excludes heavy `content` body HTML (use $slice:1 for first section only)
 * and all non-requested language packs from `languages`.
 * Saves significant bandwidth when docs contain full translated content.
 */
const RECALLS_LIST_PROJECTION = {
  _id: 1,
  slug: 1,
  report_date: 1,
  datePublished: 1,
  image: 1,
  brandName: 1,
  brand: 1,
  productDescription: 1,
  productType: 1,
  product_type: 1,
  product: 1,
  title: 1,
  reason: 1,
  terminated: 1,
  // Only pull the first content section (used for the card summary blurb)
  content: { $slice: 1 },
} as const;

/** Max time MongoDB is allowed to spend on any single operation. */
const QUERY_TIMEOUT_MS = 55000;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recalls-list");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || 50));
    const q = (searchParams.get("q") || "").trim();
    const rawCat = (searchParams.get("category") || "").trim().toLowerCase();
    const category = isValidCategorySlug(rawCat) ? rawCat : null;
    const rawLang = (searchParams.get("lang") || "en").trim().toLowerCase();
    const lang = isSiteUiLang(rawLang) ? rawLang : "en";
    const query = buildRecallsListQuery({ q, category });
    const isBaseRequest = !q && !category;
    const hasTextSearch = q.length > 0;

    const db = await getDb();
    const collection = db.collection("recalls");

    const extraLanguageProjection =
      lang === "en"
        ? undefined
        : {
            [`languages.${lang}`]: 1,
            "languages.en": 1,
          };

    const projection = extraLanguageProjection
      ? { ...RECALLS_LIST_PROJECTION, ...extraLanguageProjection }
      : RECALLS_LIST_PROJECTION;

    const cursor = collection.find(query, { projection }).maxTimeMS(QUERY_TIMEOUT_MS);
    if (hasTextSearch) {
      cursor.sort({ score: { $meta: "textScore" }, report_date: -1 });
    } else {
      cursor.sort({ report_date: -1 });
    }

    // Run count and data fetch in parallel — saves one full round-trip per request.
    const [total, recalls] = await Promise.all([
      collection.countDocuments(query, { maxTimeMS: QUERY_TIMEOUT_MS }),
      cursor.skip((page - 1) * limit).limit(limit).toArray(),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    const serialized = recalls.map((r: any) => ({
      ...r,
      _id: r._id.toString(),
    }));

    if (process.env.NODE_ENV === "development") {
      console.log("[api/recalls] MongoDB recallsatlas.recalls: total =", total, "page =", page);
    }

    const response = NextResponse.json({
      recalls: serialized,
      total,
      totalPages,
      page,
      limit,
    });

    // Cache base (no-filter) page 1 results briefly so rapid re-loads don't re-hit Mongo.
    // Filtered / search requests are not cached.
    if (isBaseRequest && page === 1) {
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    } else {
      response.headers.set("Cache-Control", "no-store");
    }

    return response;
  } catch (err: any) {
    console.error("API /api/recalls error:", err);
    return NextResponse.json(
      { error: "Failed to load recalls" },
      { status: 500 }
    );
  }
}
