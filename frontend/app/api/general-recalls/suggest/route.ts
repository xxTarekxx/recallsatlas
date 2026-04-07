import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import { loadGeneralRecallListIndex, parseGeneralRecallListLang } from "@/lib/general-recalls-data";
import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const limited = enforceRateLimit(request, "general-recalls-suggest");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "8", 10) || 8));
    const uiLang = parseGeneralRecallListLang(searchParams.get("lang"));

    if (!q) {
      return NextResponse.json({ suggestions: [] });
    }

    const all = loadGeneralRecallListIndex(uiLang);
    const suggestions: { slug: string; headline: string; productType: string }[] = [];
    for (const it of all) {
      if (!matchesQuery(it, q)) continue;
      suggestions.push({
        slug: it.slug,
        headline: it.title,
        productType: it.productType || "Consumer product",
      });
      if (suggestions.length >= limit) break;
    }

    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    console.error("API /api/general-recalls/suggest error:", err);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
