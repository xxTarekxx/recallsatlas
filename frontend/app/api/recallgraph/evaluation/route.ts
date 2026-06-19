import { NextResponse } from "next/server";
import { getRecallGraphEvaluation } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getRecallGraphEvaluation());
}
