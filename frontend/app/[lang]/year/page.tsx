import YearIndexPage from "@/components/fda/YearIndexPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangYearIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  return <YearIndexPage uiLang={langParam as SiteUiLang} />;
}
