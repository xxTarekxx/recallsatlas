import BrandIndexPage from "@/components/fda/BrandIndexPage";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

export default async function LangBrandIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  return <BrandIndexPage uiLang={langParam as SiteUiLang} />;
}
