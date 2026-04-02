import BrandRecallsPage from "@/components/fda/BrandRecallsPage";

interface PageProps {
  params: { brand: string };
}

export default async function BrandPage({ params }: PageProps) {
  const brandParam = decodeURIComponent(params.brand);
  return <BrandRecallsPage brandParam={brandParam} uiLang="en" />;
}
