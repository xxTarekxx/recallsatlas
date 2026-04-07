import GeneralRecallsSearchPage from "@/components/general-recalls/GeneralRecallsSearchPage";
import { HOME_COPY } from "@/lib/homeCopy";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await params;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  const lang = langParam as SiteUiLang;
  const t = HOME_COPY[lang];
  const canonical = `${siteUrl}/${lang}/general-recalls`;
  return {
    title: t.generalTitle,
    description: t.generalBody,
    alternates: { canonical },
  };
}

export default async function LangGeneralRecallsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lang: langParam } = await params;
  const sp = await searchParams;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  return (
    <GeneralRecallsSearchPage
      lang={langParam as SiteUiLang}
      initialQuery={sp?.q}
    />
  );
}
