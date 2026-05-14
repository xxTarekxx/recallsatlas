import BrandIndexPage from "@/components/fda/BrandIndexPage";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Browse FDA Recalls by Brand",
  description:
    "Find FDA recall notices grouped by brand, including affected food, drug, medical device, and supplement products.",
  alternates: { canonical: `${siteUrl}/brand` },
};

export default function BrandIndexRoute() {
  return <BrandIndexPage uiLang="en" />;
}
