import { NextRequest, NextResponse } from "next/server";
import { boundedIntegerParam, boundedSearchParam, enforceRateLimit } from "@/lib/apiSecurity";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "recalls-suggest");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const qParam = boundedSearchParam(searchParams, "q", 120);
    if (qParam.error) return qParam.error;
    const q = qParam.value || "";
    const limit = boundedIntegerParam(searchParams, "limit", 8, 1, 10);

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
