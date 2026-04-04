import type { Metadata } from "next";
import { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeoDefaults";
import { getShortProductName } from "@/lib/recall-utils";
import { dedupeStrings, defaultOgImageAbsolute, toAbsoluteOgImage } from "@/lib/seoShareImage";

/** Collect FDA recall image URLs (same sources as `RecallDetail`). */
export function collectFdaRecallImageUrls(recall: Record<string, unknown> | null | undefined): string[] {
  if (!recall || typeof recall !== "object") return [];
  const out: string[] = [];
  const img = recall.image as unknown;
  if (img && typeof img === "object" && img !== null && "url" in img) {
    const u = (img as { url?: string }).url;
    if (typeof u === "string" && u.trim()) out.push(u.trim());
  } else if (typeof img === "string" && img.trim()) {
    out.push(img.trim());
  }
  const arr = recall.images as unknown;
  if (Array.isArray(arr)) {
    for (const x of arr) {
      const u = typeof x === "string" ? x : (x as { url?: string })?.url;
      if (typeof u === "string" && u.trim()) out.push(u.trim());
    }
  }
  return dedupeStrings(out);
}

export function fdaRecallOpenGraphImage(recall: Record<string, unknown> | null | undefined): string {
  for (const raw of collectFdaRecallImageUrls(recall)) {
    const abs = toAbsoluteOgImage(raw);
    if (abs) return abs;
  }
  return defaultOgImageAbsolute();
}

export function buildFdaRecallMetadata(
  recall: Record<string, unknown>,
  slug: string,
  lang: string
): Metadata {
  const baseUrl = getVehicleRecallSiteBaseUrl();
  const enc = encodeURIComponent(slug);
  const canonical =
    lang === "en" ? `${baseUrl}/recalls/${enc}` : `${baseUrl}/${lang}/recalls/${enc}`;

  const product = (recall.productDescription as string) || "Product";
  const brand = (recall.brandName as string) || "Unknown brand";
  const year =
    typeof recall.report_date === "string" ? recall.report_date.slice(0, 4) : "";
  const shortProduct = getShortProductName(product);
  const title = `${shortProduct} Recall (${year}) – FDA Safety Alert`;
  const description = `FDA recall alert for ${shortProduct} manufactured by ${brand}. See reason, risk and affected batches.`;

  const ogImage = fdaRecallOpenGraphImage(recall);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
