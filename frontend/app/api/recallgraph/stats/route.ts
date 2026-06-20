import { NextResponse } from "next/server";
import { getRecallGraphStats } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getRecallGraphStats());
  } catch {
    return NextResponse.json({ error: "RecallGraph stats unavailable" }, { status: 500 });
  }
}
