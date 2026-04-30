import YearIndexPage from "@/components/fda/YearIndexPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangYearIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  return <YearIndexPage uiLang={lang as SiteUiLang} />;
}
