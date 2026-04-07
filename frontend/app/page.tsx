import HomePageContent from "@/components/recallcommon/HomePageContent";
import { getDb } from "@/lib/mongodb";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Recalls Atlas | FDA, NHTSA & CPSC Recall Search",
  description:
    "Browse FDA food, drug, and device recalls; NHTSA vehicle campaigns; and thousands of CPSC consumer product recalls—plain-language summaries with links to official notices.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Recalls Atlas — FDA, vehicle & product recalls",
    description:
      "Search and browse U.S. food, drug, device, supplement, vehicle, and consumer product recalls from FDA, NHTSA, and CPSC.",
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
