import { NextRequest, NextResponse } from "next/server";
import { getRecallGraphRecallBySlug, toPublicRecallGraphRecord } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const recall = await getRecallGraphRecallBySlug(slug);
    if (!recall) return NextResponse.json({ error: "Recall not found" }, { status: 404 });
    return NextResponse.json(toPublicRecallGraphRecord(recall));
  } catch {
    return NextResponse.json({ error: "RecallGraph recall unavailable" }, { status: 500 });
  }
}
