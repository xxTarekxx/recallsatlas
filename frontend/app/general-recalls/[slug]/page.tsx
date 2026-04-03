import { notFound } from "next/navigation";
import GeneralRecallDetail from "@/components/general-recalls/GeneralRecallDetail";
import { loadGeneralRecallBySlug, getGeneralRecallSlug } from "@/lib/general-recalls-data";
import { buildGeneralRecallMetadata } from "@/lib/general-recalls-seo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recall = loadGeneralRecallBySlug(decodeURIComponent(slug));
  if (!recall || getGeneralRecallSlug(recall) !== decodeURIComponent(slug)) {
    return { title: "Recall not found – Recalls Atlas" };
  }
  return buildGeneralRecallMetadata(recall, "en");
}

export default async function GeneralRecallPage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const recall = loadGeneralRecallBySlug(decoded);
  if (!recall || getGeneralRecallSlug(recall) !== decoded) {
    notFound();
  }
  return <GeneralRecallDetail recall={recall} lang="en" />;
}
