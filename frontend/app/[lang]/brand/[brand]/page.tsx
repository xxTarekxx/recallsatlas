import BrandRecallsPage from "@/components/fda/BrandRecallsPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string; brand: string }>;
}

export default async function LangBrandPage({ params }: PageProps) {
  const { lang, brand } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  const brandParam = decodeURIComponent(brand);
  return (
    <BrandRecallsPage brandParam={brandParam} uiLang={lang as SiteUiLang} />
  );
}
