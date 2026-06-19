import { NextRequest, NextResponse } from "next/server";
import { getRecallGraphRecallBySlug } from "@/lib/recallgraph/server/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const recall = await getRecallGraphRecallBySlug(slug);
  if (!recall) return NextResponse.json({ error: "Recall not found" }, { status: 404 });
  return NextResponse.json(recall);
}
