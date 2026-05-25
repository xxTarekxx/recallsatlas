import HomePageContent from "@/components/recallcommon/HomePageContent";
import { getGeneralRecallSlugDateMap } from "@/lib/general-recalls-data";
import { getDb } from "@/lib/mongodb";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Recalls Atlas | FDA, NHTSA & CPSC Recall Search",
  description:
    "Browse FDA food, drug, and device recalls; NHTSA vehicle campaigns; and CPSC consumer product recalls with plain-language summaries and links to official notices.",
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
  let recallsCountText = "30+";
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
  return <HomePageContent lang="en" recallsCountText={recallsCountText} />;
}
