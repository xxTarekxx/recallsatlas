import { NextResponse } from "next/server";
import { getRecallGraphHealth } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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
        embeddingStatus: "unknown",
      },
      { status: 503 }
    );
  }
}
