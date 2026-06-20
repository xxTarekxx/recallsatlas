import { NextRequest, NextResponse } from "next/server";
import { getRecallGraphRelated } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const related = await getRecallGraphRelated(id, Number(searchParams.get("limit") || 8));
    return NextResponse.json({ related });
  } catch {
    return NextResponse.json({ error: "RecallGraph related recalls unavailable" }, { status: 500 });
  }
}
