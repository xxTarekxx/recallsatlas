import { NextRequest, NextResponse } from "next/server";
import {
  badRequestResponse,
  boundedIntegerParam,
  boundedSearchParam,
  enforceRateLimit,
} from "@/lib/apiSecurity";
import { searchRecallGraph } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recallgraph-search");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const q = boundedSearchParam(searchParams, "q", 240);
    if (q.error) return q.error;
    const source = boundedSearchParam(searchParams, "source", 24);
    if (source.error) return source.error;
    const company = boundedSearchParam(searchParams, "company", 80);
    if (company.error) return company.error;
    const category = boundedSearchParam(searchParams, "category", 80);
    if (category.error) return category.error;
    const from = boundedSearchParam(searchParams, "from", 10);
    if (from.error) return from.error;
    const to = boundedSearchParam(searchParams, "to", 10);
    if (to.error) return to.error;

    if (from.value && !DATE_RE.test(from.value)) {
      return badRequestResponse("from must be YYYY-MM-DD.");
    }
    if (to.value && !DATE_RE.test(to.value)) {
      return badRequestResponse("to must be YYYY-MM-DD.");
    }

    const results = await searchRecallGraph({
      q: q.value || "",
      source: source.value,
      company: company.value,
      category: category.value,
      from: from.value,
      to: to.value,
      limit: boundedIntegerParam(searchParams, "limit", 10, 1, 24),
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "RecallGraph search unavailable" }, { status: 500 });
  }
}
