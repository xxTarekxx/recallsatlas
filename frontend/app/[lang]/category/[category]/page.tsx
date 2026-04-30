import CategoryRecallsPage from "@/components/fda/CategoryRecallsPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string; category: string }>;
}

export default async function LangCategoryPage({ params }: PageProps) {
  const { lang, category } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  const categoryParam = decodeURIComponent(category);
  return (
    <CategoryRecallsPage
      categoryParam={categoryParam}
      uiLang={lang as SiteUiLang}
    />
  );
}
