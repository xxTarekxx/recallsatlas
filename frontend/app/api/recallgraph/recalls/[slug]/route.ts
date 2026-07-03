import { NextRequest, NextResponse } from "next/server";
import { badRequestResponse, enforceRateLimit } from "@/lib/apiSecurity";
import { getRecallGraphRecallBySlug, toPublicRecallGraphRecord } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(_request, "recallgraph-detail");
  if (limited) return limited;

  try {
    const { slug } = await params;
    if (!slug || slug.length > 220 || !/^[a-z0-9-]+$/i.test(slug)) {
      return badRequestResponse("slug is invalid.");
    }
    const recall = await getRecallGraphRecallBySlug(slug);
    if (!recall) return NextResponse.json({ error: "Recall not found" }, { status: 404 });
    return NextResponse.json(toPublicRecallGraphRecord(recall));
  } catch {
    return NextResponse.json({ error: "RecallGraph recall unavailable" }, { status: 500 });
  }
}
