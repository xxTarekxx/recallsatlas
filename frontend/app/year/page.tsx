import YearIndexPage from "@/components/fda/YearIndexPage";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Browse FDA Recalls by Year",
  description:
    "Review FDA recall notices by report year, ordered from newest to oldest with links to recall detail pages.",
  alternates: { canonical: `${siteUrl}/year` },
};

export default function YearIndexRoute() {
  return <YearIndexPage uiLang="en" />;
}
