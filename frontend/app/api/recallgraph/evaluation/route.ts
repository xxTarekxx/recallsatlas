import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import { getRecallGraphEvaluation } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recallgraph-evaluation");
  if (limited) return limited;

  try {
    return NextResponse.json(await getRecallGraphEvaluation());
  } catch {
    return NextResponse.json({ error: "RecallGraph evaluation unavailable" }, { status: 500 });
  }
}
