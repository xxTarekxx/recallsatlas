import HomePageContent from "@/components/recallcommon/HomePageContent";
import { getGeneralRecallSlugDateMap } from "@/lib/general-recalls-data";
import { getDb } from "@/lib/mongodb";
import { getRecallGraphStats } from "@/lib/recallgraph/server/data";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "RecallGraph AI Semantic Recall Search | Public Recall Data Analysis",
  description:
    "Use AI recall intelligence to search public recall data by meaning, analyze related recall graph patterns, and inspect source-backed recall details.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "RecallGraph AI Semantic Recall Search",
    description:
      "AI recall intelligence, semantic recall search, related recall graph exploration, and public recall data analysis.",
    url: siteUrl,
    siteName: "Recalls Atlas",
    type: "website",
    locale: "en_US",
  },
};

async function getRecallGraphHomepageStats() {
  try {
    const stats = await getRecallGraphStats();
    return {
      recallCount: stats.totalRecalls,
      semanticSearchReady: stats.databaseStatus === "ok" && stats.embeddingsCoverageCount > 0,
    };
  } catch {
    return {
      recallCount: 0,
      semanticSearchReady: false,
    };
  }
}

export default async function HomePage() {
  let recallsCountText = "30+";
  const recallGraphStats = await getRecallGraphHomepageStats();
  const semanticSearchReady = recallGraphStats.semanticSearchReady;

  if (recallGraphStats.recallCount > 0) {
    recallsCountText = `${new Intl.NumberFormat("en-US").format(recallGraphStats.recallCount)}+`;
  }

  if (recallGraphStats.recallCount <= 0) {
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
  }

  return (
    <HomePageContent
      lang="en"
      recallsCountText={recallsCountText}
      semanticSearchReady={semanticSearchReady}
    />
  );
}
