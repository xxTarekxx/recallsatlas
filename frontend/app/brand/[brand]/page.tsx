import BrandRecallsPage from "@/components/fda/BrandRecallsPage";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ brand: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params;
  const brandParam = decodeURIComponent(brand);
  return {
    title: `${brandParam} FDA Recalls`,
    description: `FDA recall notices for ${brandParam}, including affected products, recall reasons, risks, and official source links.`,
    alternates: {
      canonical: `${siteUrl}/brand/${encodeURIComponent(brandParam)}`,
    },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { brand } = await params;
  const brandParam = decodeURIComponent(brand);
  return <BrandRecallsPage brandParam={brandParam} uiLang="en" />;
}
