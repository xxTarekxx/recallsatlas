import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Serves backend/data/recalls.json for testing (scrapeRecalls output with content[], HTML in text). */
export async function GET() {
  try {
    const base = process.cwd();
    const candidates = [
      path.join(base, "backend", "data", "recalls.json"),
      path.join(base, "..", "backend", "data", "recalls.json"),
    ];
    let data: any[] = [];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
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
