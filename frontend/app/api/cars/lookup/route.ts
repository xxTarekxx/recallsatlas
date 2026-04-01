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
        if (existing) return toLookupRecall(existing);

        // Return raw immediately; process/save in background.
        queueBackgroundSave(recall);
        return toLookupRecall(recall);
      })
    );
    return merged;
  } catch {
    // Mongo is additive only. On any DB failure, keep current API behavior.
    return recalls;
  }
}

function toLookupRecall(recall: any) {
  const languagesObj =
    recall?.languages && typeof recall.languages === "object"
      ? recall.languages
      : { en: { summary: clean(recall?.summary), remedy: clean(recall?.remedy) } };

  const en = languagesObj.en || {};
  const summary = clean(en.summary || recall?.summary || recall?.original?.summary);
  const remedy = clean(en.remedy || recall?.remedy || recall?.original?.remedy);
  const consequence = clean(recall?.consequence || recall?.original?.consequence);
  const component = clean(recall?.component);
  const reportDate = clean(recall?.reportDate);

  const translationMap: Record<
    string,
    { summary: string; remedy: string; consequence: string; component: string }
  > = {};
  for (const [code, value] of Object.entries(languagesObj)) {
    const v: any = value || {};
    translationMap[code] = {
      summary: clean(v.summary),
      remedy: clean(v.remedy),
      consequence: clean(v.consequence),
      component: clean(v.component),
    };
  }
  // Always guarantee English baseline in API response.
  translationMap.en = {
    summary: translationMap.en?.summary || summary,
    remedy: translationMap.en?.remedy || remedy,
    consequence: translationMap.en?.consequence || consequence,
    component: translationMap.en?.component || component,
  };

  return {
    campaignNumber: clean(recall?.campaignNumber),
    summary,
    remedy,
    consequence,
    component,
    reportDate,
    languages: Object.keys(translationMap),
    translations: translationMap,
  };
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

      const rewritten = await rewriteRecall({
        summary,
        remedy,
        campaignNumber,
        component: clean(rawRecall?.component),
        consequence,
      });
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
        seoTitle: rewritten.seoTitle,
        seoDescription: rewritten.seoDescription,
        canonicalPath: rewritten.canonicalPath,
        canonicalUrl: rewritten.canonicalUrl,
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

