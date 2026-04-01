import HomePageContent from "@/components/HomePageContent";
import { getDb } from "@/lib/mongodb";
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
  const canonical = `${siteUrl}/${lang}`;
  return {
    title: "Recalls Atlas | FDA & NHTSA Recall Search",
    alternates: { canonical },
    openGraph: { url: canonical },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  const lang = params.lang as SiteUiLang;
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
