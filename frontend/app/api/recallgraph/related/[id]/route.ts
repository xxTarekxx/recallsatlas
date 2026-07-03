import { NextRequest, NextResponse } from "next/server";
import { badRequestResponse, boundedIntegerParam, enforceRateLimit } from "@/lib/apiSecurity";
import { getRecallGraphRelated } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, "recallgraph-related");
  if (limited) return limited;

  try {
    const { id } = await params;
    if (!id || id.length > 80) {
      return badRequestResponse("id is invalid.");
    }
    const { searchParams } = new URL(request.url);
    const related = await getRecallGraphRelated(
      id,
      boundedIntegerParam(searchParams, "limit", 8, 1, 12)
    );
    return NextResponse.json({ related });
  } catch {
    return NextResponse.json({ error: "RecallGraph related recalls unavailable" }, { status: 500 });
  }
}
