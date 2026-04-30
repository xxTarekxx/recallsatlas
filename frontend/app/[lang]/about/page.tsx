import AboutPageContent from "@/components/AboutPageContent";
import type { Metadata } from "next";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
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
  const canonical = `${siteUrl}/${lang}/about`;
  return {
    title: "About Recalls Atlas – FDA, NHTSA & CPSC Recall Information",
    alternates: { canonical },
  };
}

export default async function LocalizedAboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  return <AboutPageContent lang={lang as SiteUiLang} />;
}
