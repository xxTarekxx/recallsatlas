import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import VehicleRecallPage from "@/components/vehicle/VehicleRecallPage";
import { vehicleRecallAlternates, vehicleRecallDescription } from "@/lib/cars/vehicleRecallSeo";

interface PageProps {
  params: Promise<{ lang: string; campaignNumber: string }>;
}

const SUPPORTED_LANGS = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"] as const;
const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, campaignNumber } = await params;
  if (!SUPPORTED_LANG_SET.has(lang)) {
    return { title: "Recall not found – Recalls Atlas" };
  }
  return {
    title: `Vehicle Recall ${campaignNumber} | Safety Alert`,
    description: vehicleRecallDescription(campaignNumber),
    alternates: vehicleRecallAlternates(campaignNumber, lang),
  };
}

export default async function VehicleRecallLangPage({ params }: PageProps) {
  const { lang, campaignNumber } = await params;
  if (!SUPPORTED_LANG_SET.has(lang)) notFound();
  if (lang === "en") redirect(`/recalls/vehicle/${campaignNumber}`);

  return <VehicleRecallPage campaignNumber={campaignNumber} lang={lang} />;
}
