import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import { parseGeneralRecallListLang, queryGeneralRecallListPage } from "@/lib/general-recalls-data";
import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;

function matchesQuery(item: GeneralRecallListItem, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [item.slug, item.title, item.summary, item.productType, item.brand, item.recallNumber]
    .join(" ")
    .toLowerCase();
  const words = s.split(/\s+/).filter(Boolean);
  return words.every((w) => hay.includes(w));
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "general-recalls-list");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const q = (searchParams.get("q") || "").trim();
    const uiLang = parseGeneralRecallListLang(searchParams.get("lang"));

    const pageResult = await queryGeneralRecallListPage(uiLang, q, page, limit);

    const response = NextResponse.json(pageResult);

    // Cache unfiltered page 1 briefly so rapid re-loads don't rebuild the index from Mongo.
    // Filtered / search results are not cached.
    if (!q && page === 1) {
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    } else {
      response.headers.set("Cache-Control", "no-store");
    }

    return response;
  } catch (err: unknown) {
    console.error("API /api/general-recalls error:", err);
    return NextResponse.json({ error: "Failed to load general recalls" }, { status: 500 });
  }
}
