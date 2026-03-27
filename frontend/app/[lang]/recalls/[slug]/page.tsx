import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { getShortProductName } from "@/lib/recall-utils";
import RecallDetail from "@/components/RecallDetail";

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

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
  "ar",
]);

export async function generateMetadata({ params }: PageProps) {
  const { slug, lang } = await params;
  if (!SUPPORTED_LANGS.has(lang)) {
    return { title: "Recall not found – RecallsAtlas" };
  }

  const db = await getDb();
  const recall = await db.collection("recalls").findOne({ slug });

  if (!recall) {
    return { title: "Recall not found – RecallsAtlas" };
  }

  const product = recall.productDescription || "Product";
  const brand = recall.brandName || "Unknown brand";
  const year =
    typeof recall.report_date === "string" ? recall.report_date.slice(0, 4) : "";
  const shortProduct = getShortProductName(product);
  const title = `${shortProduct} Recall (${year}) – FDA Safety Alert`;
  const description = `FDA recall alert for ${shortProduct} manufactured by ${brand}. See reason, risk and affected batches.`;

  return {
    title,
    description,
    alternates: { canonical: `https://recallsatlas.com/${lang}/recalls/${slug}` },
  };
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
