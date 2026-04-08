import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { enforceRateLimit } from "@/lib/apiSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const RECALLS_JSON_PATH = path.join(process.cwd(), "..", "backend", "data", "recalls.json");

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
    let data: any[] = [];
    if (fs.existsSync(RECALLS_JSON_PATH)) {
      const raw = fs.readFileSync(RECALLS_JSON_PATH, "utf8");
      data = JSON.parse(raw);
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
