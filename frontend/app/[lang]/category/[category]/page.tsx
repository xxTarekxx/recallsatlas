import CategoryRecallsPage from "@/components/fda/CategoryRecallsPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

interface PageProps {
  params: { lang: string; category: string };
}

export default async function LangCategoryPage({ params }: PageProps) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const categoryParam = decodeURIComponent(params.category);
  return (
    <CategoryRecallsPage
      categoryParam={categoryParam}
      uiLang={params.lang as SiteUiLang}
    />
  );
}
