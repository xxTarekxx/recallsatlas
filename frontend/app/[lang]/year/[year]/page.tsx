import YearRecallsPage from "@/components/fda/YearRecallsPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string; year: string }>;
}

export default async function LangYearPage({ params }: PageProps) {
  const { lang, year } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  return (
    <YearRecallsPage yearParam={year} uiLang={lang as SiteUiLang} />
  );
}
