import { NextResponse } from "next/server";
import { getCarRecalls } from "@/lib/cars/recallService";

type LookupBody = {
  vin?: string;
  year?: number | string;
  make?: string;
  model?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LookupBody;
    const vin = clean(body?.vin);

    if (vin) {
      const result = await getCarRecalls({ vin });
      return NextResponse.json({
        vehicle: result.vehicle,
        recalls: result.recalls,
      });
    }

    const year = clean(body?.year);
    const make = clean(body?.make);
    const model = clean(body?.model);

    if (!year || !make || !model) {
      return NextResponse.json(
        { error: "Missing input. Provide vin OR year + make + model." },
        { status: 400 }
      );
    }

    const result = await getCarRecalls({ year, make, model });
    return NextResponse.json({
      vehicle: result.vehicle,
      recalls: result.recalls,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to lookup vehicle recalls." },
      { status: 500 }
    );
  }
}

