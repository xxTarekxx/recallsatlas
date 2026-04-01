import RecallsSearchPage from "@/components/RecallsSearchPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default function LangRecallsPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { category?: string; q?: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return (
    <RecallsSearchPage
      lang={params.lang as SiteUiLang}
      categorySlug={searchParams?.category}
      initialQuery={searchParams?.q}
    />
  );
}
