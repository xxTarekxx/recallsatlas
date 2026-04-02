import BrandIndexPage from "@/components/fda/BrandIndexPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default function LangBrandIndex({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return <BrandIndexPage uiLang={params.lang as SiteUiLang} />;
}
