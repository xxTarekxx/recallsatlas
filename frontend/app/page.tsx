import HomePageContent from "@/components/HomePageContent";
import { getDb } from "@/lib/mongodb";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Recalls Atlas | FDA & NHTSA Recall Search",
  description:
    "Browse FDA food, drug, medical device, and supplement recalls in one place. Public safety data with plain-language summaries and direct links to official FDA.gov notices.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Recalls Atlas — FDA & vehicle recalls",
    description:
      "Search and browse U.S. food, drug, device, supplement, and vehicle recalls. Aggregated from official FDA and NHTSA sources.",
    url: siteUrl,
    siteName: "Recalls Atlas",
    type: "website",
    locale: "en_US",
  },
};

export default async function HomePage() {
  let recallsCountText = "239+";
  try {
    const db = await getDb();
    const recallsCount = await db.collection("recalls").countDocuments();
    recallsCountText = `${new Intl.NumberFormat("en-US").format(recallsCount)}+`;
  } catch {
    /* keep fallback */
  }
  return <HomePageContent lang="en" recallsCountText={recallsCountText} />;
}
