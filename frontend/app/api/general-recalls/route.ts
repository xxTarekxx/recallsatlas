import { NextRequest, NextResponse } from "next/server";
import { boundedIntegerParam, boundedSearchParam, enforceRateLimit } from "@/lib/apiSecurity";
import { getGeneralRecallListPage, parseGeneralRecallListLang } from "@/lib/general-recalls-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "general-recalls-list");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const q = boundedSearchParam(searchParams, "q", 160);
    if (q.error) return q.error;
    const lang = boundedSearchParam(searchParams, "lang", 8);
    if (lang.error) return lang.error;
    const page = boundedIntegerParam(searchParams, "page", DEFAULT_PAGE, 1, 10_000);
    const limit = boundedIntegerParam(searchParams, "limit", DEFAULT_LIMIT, 1, 100);
    const uiLang = parseGeneralRecallListLang(lang.value);
    return NextResponse.json(getGeneralRecallListPage({ lang: uiLang, q: q.value || "", page, limit }));
  } catch (err: unknown) {
    console.error("API /api/general-recalls error:", err);
    return NextResponse.json({ error: "Failed to load general recalls" }, { status: 500 });
  }
}
