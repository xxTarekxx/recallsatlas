import HomePageContent from "@/components/recallcommon/HomePageContent";
import { getGeneralRecallSlugDateMap } from "@/lib/general-recalls-data";
import { getDb } from "@/lib/mongodb";
import { getRecallGraphHealth } from "@/lib/recallgraph/server/data";
import type { Metadata } from "next";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await params;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  const lang = langParam as SiteUiLang;
  const canonical = `${siteUrl}/${lang}`;
  return {
    title: "RecallGraph AI Semantic Recall Search | Public Recall Data Analysis",
    description:
      "Use AI recall intelligence to search public recall data by meaning, analyze related recall graph patterns, and inspect source-backed recall details.",
    alternates: { canonical },
    openGraph: { url: canonical },
  };
}

async function getSemanticSearchReady() {
  try {
    const health = await getRecallGraphHealth();
    return health.database === "ok" && health.embeddingCount > 0;
  } catch {
    return false;
  }
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  const lang = langParam as SiteUiLang;
  let recallsCountText = "30+";
  const semanticSearchReady = await getSemanticSearchReady();
  try {
    const db = await getDb();
    const [fdaCount, vehicleCount] = await Promise.all([
      db.collection("recalls").countDocuments(),
      db.collection("cars").countDocuments(),
    ]);
    const recallsCount = fdaCount + vehicleCount + getGeneralRecallSlugDateMap().size;
    recallsCountText = `${new Intl.NumberFormat("en-US").format(recallsCount)}+`;
  } catch {
    /* keep fallback */
  }
  return (
    <HomePageContent
      lang={lang}
      recallsCountText={recallsCountText}
      semanticSearchReady={semanticSearchReady}
    />
  );
}
