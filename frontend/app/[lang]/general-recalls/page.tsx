import GeneralRecallsSearchPage from "@/components/general-recalls/GeneralRecallsSearchPage";
import { getGeneralRecallListPage } from "@/lib/general-recalls-data";
import { HOME_COPY } from "@/lib/homeCopy";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const lang = params.lang as SiteUiLang;
  const t = HOME_COPY[lang];
  const canonical = `${siteUrl}/${lang}/general-recalls`;
  return {
    title: t.generalTitle,
    description: t.generalBody,
    alternates: { canonical },
  };
}

export default function LangGeneralRecallsIndexPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { q?: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const lang = params.lang as SiteUiLang;
  const initialData = getGeneralRecallListPage({
    lang,
    q: searchParams?.q || "",
  });
  return (
    <GeneralRecallsSearchPage
      lang={lang}
      initialQuery={searchParams?.q}
      initialData={initialData}
    />
  );
}
