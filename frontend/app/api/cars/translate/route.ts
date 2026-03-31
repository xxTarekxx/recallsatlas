import { NextResponse } from "next/server";
import { getRecallFromDB, saveRecallToDB } from "@/lib/cars/carDb";
import { translateRecall } from "@/lib/cars/translateRecall";

type TranslateBody = {
  campaignNumber?: string;
  lang?: string;
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

    const recall: any = await getRecallFromDB(campaignNumber);
    if (!recall) {
      return NextResponse.json({ error: "Recall not found." }, { status: 404 });
    }

    if (recall.languages?.[lang]) {
      return NextResponse.json({
        campaignNumber,
        summary: recall.languages[lang].summary || "",
        remedy: recall.languages[lang].remedy || "",
      });
    }

    const enSummary = clean(recall.languages?.en?.summary || recall.original?.summary);
    const enRemedy = clean(recall.languages?.en?.remedy || recall.original?.remedy);

    // Re-check right before OpenAI call to reduce race-condition duplicate translations.
    const latest: any = await getRecallFromDB(campaignNumber);
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

    await saveRecallToDB({
      campaignNumber,
      languages: mergedLanguages,
    });

    return NextResponse.json({
      campaignNumber,
      summary: translated.summary,
      remedy: translated.remedy,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Translation failed." },
      { status: 500 }
    );
  }
}

