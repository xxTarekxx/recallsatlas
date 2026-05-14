import YearRecallsPage from "@/components/fda/YearRecallsPage";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ year: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const yearParam = decodeURIComponent(year);
  return {
    title: `${yearParam} FDA Recalls`,
    description: `FDA recall notices reported in ${yearParam}, grouped into an archive with affected products, recall reasons, and source details.`,
    alternates: {
      canonical: `${siteUrl}/year/${encodeURIComponent(yearParam)}`,
    },
  };
}

export default async function YearPage({ params }: PageProps) {
  const { year } = await params;
  return <YearRecallsPage yearParam={year} uiLang="en" />;
}
