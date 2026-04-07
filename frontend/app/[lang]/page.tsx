import HomePageContent from "@/components/recallcommon/HomePageContent";
import { getDb } from "@/lib/mongodb";
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
  const canonical = `${siteUrl}/${lang}`;
  return {
    title: "Recalls Atlas | FDA, NHTSA & CPSC Recall Search",
    alternates: { canonical },
    openGraph: { url: canonical },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isSiteUiLang(langParam) || langParam === "en") notFound();
  const lang = langParam as SiteUiLang;
  let recallsCountText = "239+";
  try {
    const db = await getDb();
    const recallsCount = await db.collection("recalls").countDocuments();
    recallsCountText = `${new Intl.NumberFormat("en-US").format(recallsCount)}+`;
  } catch {
    /* keep fallback */
  }
  return <HomePageContent lang={lang} recallsCountText={recallsCountText} />;
}
