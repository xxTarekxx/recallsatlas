import { NextResponse } from "next/server";
import { getCarRecalls } from "@/lib/cars/recallService";
import { getRecallFromDB, saveRecallToDB } from "@/lib/cars/carDb";
import { rewriteRecall } from "@/lib/cars/rewriteRecall";

type LookupBody = {
  vin?: string;
  year?: number | string;
  make?: string;
  model?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

const inFlightCampaigns = new Set<string>();
const URGENT_TERMS = ["fire", "injury", "crash", "death"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LookupBody;
    const vin = clean(body?.vin);

    if (vin) {
      const result = await getCarRecalls({ vin });
      const recalls = await mergeRecallsWithDb(result.recalls);
      return NextResponse.json({
        vehicle: result.vehicle,
        recalls,
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
    const recalls = await mergeRecallsWithDb(result.recalls);
    return NextResponse.json({
      vehicle: result.vehicle,
      recalls,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to lookup vehicle recalls." },
      { status: 500 }
    );
  }
}

async function mergeRecallsWithDb(recalls: any[]) {
  try {
    const merged = await Promise.all(
      recalls.map(async (recall) => {
        const campaignNumber = clean(recall?.campaignNumber);
        if (!campaignNumber) return recall;
        const existing = await getRecallFromDB(campaignNumber);
        if (existing) return existing;

        // Return raw immediately; process/save in background.
        queueBackgroundSave(recall);
        return recall;
      })
    );
    return merged;
  } catch {
    // Mongo is additive only. On any DB failure, keep current API behavior.
    return recalls;
  }
}

function isUrgent(summary: string, consequence: string) {
  const hay = `${summary || ""} ${consequence || ""}`.toLowerCase();
  return URGENT_TERMS.some((t) => hay.includes(t));
}

function queueBackgroundSave(rawRecall: any) {
  const campaignNumber = clean(rawRecall?.campaignNumber);
  if (!campaignNumber || inFlightCampaigns.has(campaignNumber)) return;
  inFlightCampaigns.add(campaignNumber);

  Promise.resolve()
    .then(async () => {
      // Duplicate prevention: if already saved meanwhile, skip OpenAI.
      const alreadyThere = await getRecallFromDB(campaignNumber).catch(() => null);
      if (alreadyThere) return;

      const summary = clean(rawRecall?.summary);
      const remedy = clean(rawRecall?.remedy);
      const consequence = clean(rawRecall?.consequence);

      const rewritten = await rewriteRecall({ summary, remedy });
      const now = new Date().toISOString();

      await saveRecallToDB({
        campaignNumber,
        component: clean(rawRecall?.component),
        reportDate: clean(rawRecall?.reportDate),
        original: {
          summary,
          remedy,
          consequence,
        },
        languages: {
          en: {
            summary: rewritten.summary_rewritten,
            remedy: rewritten.remedy_rewritten,
          },
        },
        urgent: isUrgent(summary, consequence),
        createdAt: now,
        updatedAt: now,
      });
    })
    .catch(() => {
      // Keep API response path unaffected on background failure.
    })
    .finally(() => {
      inFlightCampaigns.delete(campaignNumber);
    });
}

