import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "8", 10) || 8));

    if (!q) {
      return NextResponse.json({ suggestions: [] });
    }

    const db = await getDb();
    const collection = db.collection("recalls");
    const pattern = escapeRegex(q);
    const query = {
      $or: [
        { headline: { $regex: pattern, $options: "i" } },
        { productType: { $regex: pattern, $options: "i" } },
      ],
    };

    const recalls = await collection
      .find(query)
      .project({ _id: 1, slug: 1, headline: 1, productType: 1, report_date: 1 })
      .sort({ report_date: -1 })
      .limit(limit)
      .toArray();

    const suggestions = recalls.map((r: any) => ({
      slug: r.slug,
      headline: r.headline || "",
      productType: r.productType || "",
    }));

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error("API /api/recalls/suggest error:", err);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
