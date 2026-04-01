import YearIndexPage from "@/components/YearIndexPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default function LangYearIndex({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return <YearIndexPage uiLang={params.lang as SiteUiLang} />;
}
