import { NextResponse } from "next/server";
import { getRecallFromDB, saveRecallToDB } from "@/lib/cars/carDb";
import { translateRecall } from "@/lib/cars/translateRecall";

type TranslateBody = {
  campaignNumber?: string;
  lang?: string;
  /** English fallback when the campaign is not in Mongo yet (e.g. background save pending). */
  summary?: string;
  remedy?: string;
  consequence?: string;
  component?: string;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function englishConsequence(recall: any, fallback: string) {
  return clean(
    recall?.languages?.en?.consequence ??
      recall?.original?.consequence ??
      fallback
  );
}

function englishComponent(recall: any, fallback: string) {
  return clean(
    recall?.languages?.en?.component ??
      recall?.original?.component ??
      recall?.component ??
      fallback
  );
}

/** Cached translation is complete including consequence/component when English has them. */
function hasCompleteTranslation(recall: any, lang: string) {
  const t = recall?.languages?.[lang];
  if (!t) return false;
  if (!clean(t.summary) || !clean(t.remedy)) return false;
  const enC = englishConsequence(recall, "");
  if (enC && !clean(t.consequence)) return false;
  const enComp = englishComponent(recall, "");
  if (enComp && !clean(t.component)) return false;
  return true;
}

function translationResponse(campaignNumber: string, entry: any) {
  return NextResponse.json({
    campaignNumber,
    summary: clean(entry?.summary),
    remedy: clean(entry?.remedy),
    consequence: clean(entry?.consequence),
    component: clean(entry?.component),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TranslateBody;
    const campaignNumber = clean(body?.campaignNumber);
    const lang = clean(body?.lang).toLowerCase();

    if (!campaignNumber || !lang) {
      return NextResponse.json(
        { error: "campaignNumber and lang are required." },
        { status: 400 }
      );
    }

    let recall: any = null;
    try {
      recall = await getRecallFromDB(campaignNumber);
    } catch (dbErr) {
      console.error("[api/cars/translate] getRecallFromDB failed:", dbErr);
      recall = null;
    }
    const fallbackSummary = clean(body?.summary);
    const fallbackRemedy = clean(body?.remedy);
    const fallbackConsequence = clean(body?.consequence);
    const fallbackComponent = clean(body?.component);

    if (!recall) {
      if (!fallbackSummary && !fallbackRemedy) {
        return NextResponse.json(
          {
            error:
              "Recall is not in the database yet. Pass English summary/remedy from the lookup response, or ensure MongoDB is configured and the campaign is saved.",
          },
          { status: 422 }
        );
      }
      recall = {
        campaignNumber,
        languages: {
          en: {
            summary: fallbackSummary,
            remedy: fallbackRemedy,
            consequence: fallbackConsequence,
          },
        },
        original: {
          summary: fallbackSummary,
          remedy: fallbackRemedy,
          consequence: fallbackConsequence,
        },
      };
    }

    if (hasCompleteTranslation(recall, lang)) {
      return translationResponse(campaignNumber, recall.languages[lang]);
    }

    const enSummary = clean(
      recall.languages?.en?.summary || recall.original?.summary || fallbackSummary
    );
    const enRemedy = clean(
      recall.languages?.en?.remedy || recall.original?.remedy || fallbackRemedy
    );
    const enConsequence = englishConsequence(recall, fallbackConsequence);

    if (!enSummary && !enRemedy) {
      return NextResponse.json(
        { error: "No English summary or remedy available to translate." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "Translation is unavailable: OPENAI_API_KEY is not set on the server." },
        { status: 503 }
      );
    }

    let latest: any = null;
    try {
      latest = await getRecallFromDB(campaignNumber);
    } catch {
      latest = null;
    }
    if (latest && hasCompleteTranslation(latest, lang)) {
      return translationResponse(campaignNumber, latest.languages[lang]);
    }
    if (latest) {
      recall = latest;
    }

    const enSummaryFinal = clean(
      recall.languages?.en?.summary || recall.original?.summary || fallbackSummary
    );
    const enRemedyFinal = clean(
      recall.languages?.en?.remedy || recall.original?.remedy || fallbackRemedy
    );
    const enConsequenceFinal = englishConsequence(recall, fallbackConsequence);
    const enComponentFinal = englishComponent(recall, fallbackComponent);

    const translated = await translateRecall({
      summary: enSummaryFinal,
      remedy: enRemedyFinal,
      consequence: enConsequenceFinal,
      component: enComponentFinal,
      lang,
    });

    const mergedLanguages = {
      ...(recall.languages || {}),
      [lang]: {
        summary: translated.summary,
        remedy: translated.remedy,
        consequence: translated.consequence,
        component: translated.component,
      },
    };

    try {
      await saveRecallToDB({
        campaignNumber,
        languages: mergedLanguages,
      });
    } catch (saveErr) {
      console.error("[api/cars/translate] saveRecallToDB failed:", saveErr);
    }

    return NextResponse.json({
      campaignNumber,
      summary: translated.summary,
      remedy: translated.remedy,
      consequence: translated.consequence,
      component: translated.component,
    });
  } catch (err: any) {
    console.error("[api/cars/translate]", err);
    return NextResponse.json(
      { error: err?.message || "Translation failed." },
      { status: 500 }
    );
  }
}
