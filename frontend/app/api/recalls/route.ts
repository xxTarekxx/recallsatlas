import { NextRequest, NextResponse } from "next/server";
import {
  boundedIntegerParam,
  boundedSearchParam,
  enforceRateLimit,
} from "@/lib/apiSecurity";
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
    const q = boundedSearchParam(searchParams, "q", 160);
    if (q.error) return q.error;
    const category = boundedSearchParam(searchParams, "category", 80);
    if (category.error) return category.error;
    const lang = boundedSearchParam(searchParams, "lang", 8);
    if (lang.error) return lang.error;

    const data = await loadRecallsListPage({
      page: boundedIntegerParam(searchParams, "page", DEFAULT_RECALLS_PAGE, 1, 10_000),
      limit: boundedIntegerParam(searchParams, "limit", DEFAULT_RECALLS_PAGE_SIZE, 1, 100),
      q: q.value || "",
      category: category.value,
      lang: lang.value,
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
