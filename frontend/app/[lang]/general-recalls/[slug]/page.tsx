import { notFound } from "next/navigation";
import GeneralRecallDetail from "@/components/general-recalls/GeneralRecallDetail";
import { loadGeneralRecallBySlug, getGeneralRecallSlug } from "@/lib/general-recalls-data";
import { buildGeneralRecallMetadata } from "@/lib/general-recalls-seo";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, lang } = await params;
  if (!isSiteUiLang(lang)) {
    return { title: "Recall not found – Recalls Atlas" };
  }
  const decoded = decodeURIComponent(slug);
  const recall = loadGeneralRecallBySlug(decoded);
  if (!recall || getGeneralRecallSlug(recall) !== decoded) {
    return { title: "Recall not found – Recalls Atlas" };
  }
  return buildGeneralRecallMetadata(recall, lang);
}

export default async function GeneralRecallLangPage({ params }: PageProps) {
  const { slug, lang } = await params;
  if (!isSiteUiLang(lang)) notFound();

  const decoded = decodeURIComponent(slug);
  const recall = loadGeneralRecallBySlug(decoded);
  if (!recall || getGeneralRecallSlug(recall) !== decoded) {
    notFound();
  }

  return <GeneralRecallDetail recall={recall} lang={lang as SiteUiLang} />;
}
