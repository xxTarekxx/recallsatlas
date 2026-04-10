import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
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
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || 50));
    const q = (searchParams.get("q") || "").trim();
    const uiLang = parseGeneralRecallListLang(searchParams.get("lang"));
    return NextResponse.json(getGeneralRecallListPage({ lang: uiLang, q, page, limit }));
  } catch (err: unknown) {
    console.error("API /api/general-recalls error:", err);
    return NextResponse.json({ error: "Failed to load general recalls" }, { status: 500 });
  }
}
