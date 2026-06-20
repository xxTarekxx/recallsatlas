import HomePageContent from "@/components/recallcommon/HomePageContent";
import { getGeneralRecallSlugDateMap } from "@/lib/general-recalls-data";
import { getDb } from "@/lib/mongodb";
import { getRecallGraphHealth } from "@/lib/recallgraph/server/data";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "RecallGraph AI Recall Intelligence Platform | Semantic Recall Search",
  description:
    "Search public recall data by meaning, hazard pattern, product type, company, and consumer risk with RecallGraph AI semantic search and source-backed recall details.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "RecallGraph AI Recall Intelligence Platform",
    description:
      "Semantic recall search, related recall graph exploration, and public recall data analysis from structured FDA, NHTSA, and CPSC data.",
    url: siteUrl,
    siteName: "Recalls Atlas",
    type: "website",
    locale: "en_US",
  },
};

async function getSemanticSearchReady() {
  try {
    const health = await getRecallGraphHealth();
    return health.database === "ok" && health.embeddingProvider === "openai" && health.embeddingCount > 0;
  } catch {
    return false;
  }
}

export default async function HomePage() {
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
      lang="en"
      recallsCountText={recallsCountText}
      semanticSearchReady={semanticSearchReady}
    />
  );
}
