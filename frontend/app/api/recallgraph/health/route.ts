import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import { getRecallGraphHealth } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recallgraph-health");
  if (limited) return limited;

  try {
    const health = await getRecallGraphHealth();
    return NextResponse.json(health);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        recallCount: 0,
        embeddingCount: 0,
        relatedLinkCount: 0,
        evaluationQueryCount: 0,
        embeddingProvider: "unknown",
      },
      { status: 503 }
    );
  }
}
