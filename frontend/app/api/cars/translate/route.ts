import { NextResponse } from "next/server";
import { getRecallFromDB, saveRecallToDB } from "@/lib/cars/carDb";
import { translateRecall } from "@/lib/cars/translateRecall";

type TranslateBody = {
  campaignNumber?: string;
  lang?: string;
  /** English fallback when the campaign is not in Mongo yet (e.g. background save pending). */
  summary?: string;
  remedy?: string;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
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
          en: { summary: fallbackSummary, remedy: fallbackRemedy },
        },
        original: { summary: fallbackSummary, remedy: fallbackRemedy },
      };
    }

    if (recall.languages?.[lang]) {
      return NextResponse.json({
        campaignNumber,
        summary: recall.languages[lang].summary || "",
        remedy: recall.languages[lang].remedy || "",
      });
    }

    const enSummary = clean(
      recall.languages?.en?.summary || recall.original?.summary || fallbackSummary
    );
    const enRemedy = clean(recall.languages?.en?.remedy || recall.original?.remedy || fallbackRemedy);

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

    // Re-check right before OpenAI call to reduce race-condition duplicate translations.
    let latest: any = null;
    try {
      latest = await getRecallFromDB(campaignNumber);
    } catch {
      latest = null;
    }
    if (latest?.languages?.[lang]) {
      return NextResponse.json({
        campaignNumber,
        summary: latest.languages[lang].summary || "",
        remedy: latest.languages[lang].remedy || "",
      });
    }

    const translated = await translateRecall({ summary: enSummary, remedy: enRemedy, lang });

    const mergedLanguages = {
      ...(recall.languages || {}),
      [lang]: {
        summary: translated.summary,
        remedy: translated.remedy,
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
    });
  } catch (err: any) {
    console.error("[api/cars/translate]", err);
    return NextResponse.json(
      { error: err?.message || "Translation failed." },
      { status: 500 }
    );
  }
}

