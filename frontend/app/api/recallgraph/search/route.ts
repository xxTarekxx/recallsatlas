import { NextRequest, NextResponse } from "next/server";
import { searchRecallGraph } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const results = await searchRecallGraph({
    q: searchParams.get("q") || "",
    source: searchParams.get("source") || undefined,
    company: searchParams.get("company") || undefined,
    category: searchParams.get("category") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    limit: Number(searchParams.get("limit") || 10),
  });

  return NextResponse.json({ results });
}
