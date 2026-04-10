import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import {
  DEFAULT_RECALLS_PAGE,
  DEFAULT_RECALLS_PAGE_SIZE,
  loadRecallsListPage,
} from "@/lib/recalls-list-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recalls-list");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const data = await loadRecallsListPage({
      page: parseInt(searchParams.get("page") || String(DEFAULT_RECALLS_PAGE), 10) || 1,
      limit:
        parseInt(searchParams.get("limit") || String(DEFAULT_RECALLS_PAGE_SIZE), 10) ||
        DEFAULT_RECALLS_PAGE_SIZE,
      q: searchParams.get("q") || "",
      category: searchParams.get("category"),
      lang: searchParams.get("lang"),
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[api/recalls] MongoDB recallsatlas.recalls: total =",
        data.total,
        "page =",
        data.page
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("API /api/recalls error:", err);
    return NextResponse.json(
      { error: "Failed to load recalls" },
      { status: 500 }
    );
  }
}
