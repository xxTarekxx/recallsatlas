import RecallsSearchPage from "@/components/fda/RecallsSearchPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangRecallsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { lang: langParam } = await params;
  const sp = await searchParams;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  return (
    <RecallsSearchPage
      lang={langParam as SiteUiLang}
      categorySlug={sp?.category}
      initialQuery={sp?.q}
    />
  );
}
