import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import { getRecallGraphStats } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recallgraph-stats");
  if (limited) return limited;

  try {
    return NextResponse.json(await getRecallGraphStats());
  } catch {
    return NextResponse.json({ error: "RecallGraph stats unavailable" }, { status: 500 });
  }
}
