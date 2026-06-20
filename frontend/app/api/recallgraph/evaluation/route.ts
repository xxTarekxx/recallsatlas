import { NextResponse } from "next/server";
import { getRecallGraphEvaluation } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getRecallGraphEvaluation());
  } catch {
    return NextResponse.json({ error: "RecallGraph evaluation unavailable" }, { status: 500 });
  }
}
