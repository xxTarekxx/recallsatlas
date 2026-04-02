import YearRecallsPage from "@/components/fda/YearRecallsPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

interface PageProps {
  params: { lang: string; year: string };
}

export default async function LangYearPage({ params }: PageProps) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return (
    <YearRecallsPage yearParam={params.year} uiLang={params.lang as SiteUiLang} />
  );
}
