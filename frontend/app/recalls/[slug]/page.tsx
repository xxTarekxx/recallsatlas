import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { getShortRecallTitle } from "@/lib/recall-utils";
import RecallDetail from "@/components/fda/RecallDetail";
import { buildFdaRecallMetadata } from "@/lib/fdaRecallSeo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const db = await getDb();
  const recall = await db.collection("recalls").findOne({ slug });

  if (!recall) {
    return { title: "Recall not found – Recalls Atlas" };
  }

  return buildFdaRecallMetadata(recall as Record<string, unknown>, slug, "en");
}

export default async function RecallDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let recall: any | null = null;
  let dbError: string | null = null;

  try {
    const db = await getDb();
    recall = await db.collection("recalls").findOne({ slug });
  } catch (err: any) {
    console.error("Error loading recall detail:", err);
    dbError = "Unable to load this recall at the moment.";
  }

  if (!recall && !dbError) {
    notFound();
  }

  const serialized = recall ? JSON.parse(JSON.stringify(recall)) : null;
  return <RecallDetail recall={serialized} dbError={dbError} currentLang="en" />;
}
