import RecallsSearchPage from "@/components/fda/RecallsSearchPage";
import { loadRecallsListPage } from "@/lib/recalls-list-data";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangRecallsPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { category?: string; q?: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const lang = params.lang as SiteUiLang;
  const initialData = await loadRecallsListPage({
    page: 1,
    q: searchParams?.q,
    category: searchParams?.category,
    lang,
  });
  return (
    <RecallsSearchPage
      lang={lang}
      categorySlug={searchParams?.category}
      initialQuery={searchParams?.q}
      initialData={initialData}
    />
  );
}
