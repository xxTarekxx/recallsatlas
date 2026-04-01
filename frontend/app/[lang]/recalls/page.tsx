import RecallsSearchPage from "@/components/RecallsSearchPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default function LangRecallsPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return <RecallsSearchPage lang={params.lang as SiteUiLang} />;
}
