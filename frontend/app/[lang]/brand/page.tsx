import BrandIndexPage from "@/components/fda/BrandIndexPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangBrandIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  return <BrandIndexPage uiLang={lang as SiteUiLang} />;
}
