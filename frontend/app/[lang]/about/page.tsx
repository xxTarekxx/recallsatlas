import AboutPageContent from "@/components/AboutPageContent";
import type { Metadata } from "next";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const lang = params.lang as SiteUiLang;
  const canonical = `${siteUrl}/${lang}/about`;
  return {
    title: "About Recalls Atlas – Independent FDA Recall Aggregator",
    alternates: { canonical },
  };
}

export default function LocalizedAboutPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return <AboutPageContent lang={params.lang as SiteUiLang} />;
}
