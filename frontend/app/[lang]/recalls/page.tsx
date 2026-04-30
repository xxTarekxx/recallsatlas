import RecallsSearchPage from "@/components/fda/RecallsSearchPage";
import { loadRecallsListPage } from "@/lib/recalls-list-data";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangRecallsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { lang } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  const resolvedSearchParams = await searchParams;
  const initialData = await loadRecallsListPage({
    page: 1,
    q: resolvedSearchParams?.q,
    category: resolvedSearchParams?.category,
    lang: lang as SiteUiLang,
  });
  return (
    <RecallsSearchPage
      lang={lang as SiteUiLang}
      categorySlug={resolvedSearchParams?.category}
      initialQuery={resolvedSearchParams?.q}
      initialData={initialData}
    />
  );
}
