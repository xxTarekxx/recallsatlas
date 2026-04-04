import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import RecallDetail from "@/components/fda/RecallDetail";
import { buildFdaRecallMetadata } from "@/lib/fdaRecallSeo";

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

/** Must match Mongo `recalls.languages` keys (e.g. FDA `recalls.json` uses `hi` for Hindi). */
const SUPPORTED_LANGS = new Set([
  "en",
  "es",
  "de",
  "ja",
  "fr",
  "pt",
  "ru",
  "it",
  "nl",
  "pl",
  "tr",
  "fa",
  "zh",
  "vi",
  "id",
  "cs",
  "ko",
  "uk",
  "hu",
  "hi",
  "ar",
]);

export async function generateMetadata({ params }: PageProps) {
  const { slug, lang } = await params;
  if (!SUPPORTED_LANGS.has(lang)) {
    return { title: "Recall not found – Recalls Atlas" };
  }

  const db = await getDb();
  const recall = await db.collection("recalls").findOne({ slug });

  if (!recall) {
    return { title: "Recall not found – Recalls Atlas" };
  }

  return buildFdaRecallMetadata(recall as Record<string, unknown>, slug, lang);
}

export default async function RecallDetailLangPage({ params }: PageProps) {
  const { slug, lang } = await params;
  if (!SUPPORTED_LANGS.has(lang)) notFound();

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

  return <RecallDetail recall={recall} dbError={dbError} currentLang={lang} />;
}
