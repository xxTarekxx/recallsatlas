import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || 50));

    const db = await getDb();
    const collection = db.collection("recalls");
    const total = await collection.countDocuments({});
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    const recalls = await collection
      .find({})
      .sort({ report_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const serialized = recalls.map((r: any) => ({
      ...r,
      _id: r._id.toString(),
    }));

    if (process.env.NODE_ENV === "development") {
      console.log("[api/recalls] MongoDB recallsatlas.recalls: total =", total, "page =", page);
    }

    return NextResponse.json({
      recalls: serialized,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("API /api/recalls error:", err);
    return NextResponse.json(
      { error: "Failed to load recalls" },
      { status: 500 }
    );
  }
}
