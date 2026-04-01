import BrandRecallsPage from "@/components/BrandRecallsPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

interface PageProps {
  params: { lang: string; brand: string };
}

export default async function LangBrandPage({ params }: PageProps) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const brandParam = decodeURIComponent(params.brand);
  return (
    <BrandRecallsPage brandParam={brandParam} uiLang={params.lang as SiteUiLang} />
  );
}
