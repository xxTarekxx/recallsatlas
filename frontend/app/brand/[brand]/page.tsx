import BrandRecallsPage from "@/components/fda/BrandRecallsPage";

interface PageProps {
  params: Promise<{ brand: string }>;
}

export default async function BrandPage({ params }: PageProps) {
  const { brand } = await params;
  const brandParam = decodeURIComponent(brand);
  return <BrandRecallsPage brandParam={brandParam} uiLang="en" />;
}
