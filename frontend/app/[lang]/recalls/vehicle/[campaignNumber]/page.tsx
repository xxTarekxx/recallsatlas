import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import VehicleRecallPage from "@/components/vehicle/VehicleRecallPage";
import { buildVehicleRecallMetadata } from "@/lib/cars/vehicleRecallSeo";
import { isSiteUiLang } from "@/lib/siteLocale";

interface PageProps {
  params: Promise<{ lang: string; campaignNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, campaignNumber } = await params;
  if (!isSiteUiLang(lang)) {
    return { title: "Recall not found – Recalls Atlas" };
  }
  return buildVehicleRecallMetadata(campaignNumber, lang);
}

export default async function VehicleRecallLangPage({ params }: PageProps) {
  const { lang, campaignNumber } = await params;
  if (!isSiteUiLang(lang)) notFound();
  if (lang === "en") redirect(`/recalls/vehicle/${campaignNumber}`);

  return <VehicleRecallPage campaignNumber={campaignNumber} lang={lang} />;
}
