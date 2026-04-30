import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { enforceRateLimit } from "@/lib/apiSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Serves backend/data/recalls.json for local/testing only.
 * Disabled in production unless ALLOW_RECALLS_JSON_API=1.
 */
export async function GET(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_RECALLS_JSON_API !== "1"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limited = enforceRateLimit(request, "recalls-json");
  if (limited) return limited;

  try {
    const base = process.cwd();
    const candidates = [
      path.join(base, "backend", "data", "recalls.json"),
      path.join(base, "..", "backend", "data", "recalls.json"),
    ];
    let data: any[] = [];
    for (const filePath of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf8");
        data = JSON.parse(raw);
        break;
      }
    }
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "recalls.json not found or invalid (run from project root or frontend)" },
        { status: 404 }
      );
    }
    return NextResponse.json({ recalls: data, total: data.length });
  } catch (err: any) {
    console.error("API /api/recalls/json error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load recalls.json" },
      { status: 500 }
    );
  }
}
