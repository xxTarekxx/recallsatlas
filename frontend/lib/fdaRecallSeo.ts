import type { Metadata } from "next";
import { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeoDefaults";
import { getShortProductName } from "@/lib/recall-utils";
import { dedupeStrings, defaultOgImageAbsolute, toAbsoluteOgImage } from "@/lib/seoShareImage";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimForMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

function looksGenericTitle(value: string): boolean {
  const t = value.trim().toLowerCase();
  return !t || t === "product recall" || t === "recall" || t === "fda safety alert";
}

function localizedFdaValue(
  recall: Record<string, unknown>,
  lang: string,
  key: string
): string {
  const languages =
    recall.languages && typeof recall.languages === "object"
      ? (recall.languages as Record<string, Record<string, unknown>>)
      : {};
  const active = languages[lang] && typeof languages[lang] === "object" ? languages[lang] : null;
  const english = languages.en && typeof languages.en === "object" ? languages.en : null;
  return asString(active?.[key]) || asString(english?.[key]) || asString(recall[key]);
}

/** Collect FDA recall image URLs (same sources as `RecallDetail`). */
export function collectFdaRecallImageUrls(
  recall: Record<string, unknown> | null | undefined
): string[] {
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

export function fdaRecallOpenGraphImage(
  recall: Record<string, unknown> | null | undefined
): string {
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

  const product = localizedFdaValue(recall, lang, "productDescription") || "Product";
  const brand = localizedFdaValue(recall, lang, "brandName") || "Unknown brand";
  const year =
    typeof recall.report_date === "string" ? recall.report_date.slice(0, 4) : "";
  const shortProduct = getShortProductName(product);
  const preferredTitle =
    localizedFdaValue(recall, lang, "headline") ||
    localizedFdaValue(recall, lang, "title");
  const title = !looksGenericTitle(preferredTitle)
    ? preferredTitle
    : `${shortProduct} Recall (${year}) - FDA Safety Alert`;
  const preferredDescription =
    localizedFdaValue(recall, lang, "description") ||
    localizedFdaValue(recall, lang, "summary") ||
    asString(recall.metaDescription);
  const description = preferredDescription
    ? trimForMeta(preferredDescription, 160)
    : trimForMeta(
        `FDA recall alert for ${shortProduct} manufactured by ${brand}. See reason, risk and affected batches.`,
        160
      );

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
