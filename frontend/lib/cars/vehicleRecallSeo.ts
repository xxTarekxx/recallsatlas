import type { Metadata } from "next";
import { getRecallFromDB } from "@/lib/cars/carDb";
import {
  defaultVehicleRecallSeo,
  getVehicleRecallSiteBaseUrl,
} from "@/lib/cars/vehicleRecallSeoDefaults";
import { dedupeStrings, defaultOgImageAbsolute, toAbsoluteOgImage } from "@/lib/seoShareImage";

/** Vehicle recall SEO languages (hreflang + routes). */
const VEHICLE_LANG_CODES = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"] as const;

export { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeoDefaults";

/**
 * Canonical + hreflang alternates for vehicle recall pages.
 * English canonical: /recalls/vehicle/[id]; other langs: /[lang]/recalls/vehicle/[id]
 */
export function vehicleRecallAlternates(
  campaignNumber: string,
  lang: string
): NonNullable<Metadata["alternates"]> {
  const baseUrl = getVehicleRecallSiteBaseUrl();
  const canonical =
    lang === "en"
      ? `${baseUrl}/recalls/vehicle/${campaignNumber}`
      : `${baseUrl}/${lang}/recalls/vehicle/${campaignNumber}`;

  const defaultEnUrl = `${baseUrl}/recalls/vehicle/${campaignNumber}`;
  const languages: Record<string, string> = {
    "x-default": defaultEnUrl,
  };
  for (const code of VEHICLE_LANG_CODES) {
    if (code === "en") {
      languages.en = defaultEnUrl;
    } else {
      languages[code] = `${baseUrl}/${code}/recalls/vehicle/${campaignNumber}`;
    }
  }

  return { canonical, languages };
}

function collectVehicleImageUrlCandidates(doc: Record<string, unknown> | null): string[] {
  if (!doc) return [];
  const out: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  };
  add(doc.imageUrl);
  add(doc.thumbnailUrl);
  const im = doc.image;
  if (im && typeof im === "object" && im !== null && "url" in im) {
    add((im as { url?: string }).url);
  }
  add(im);
  const media = doc.media;
  if (Array.isArray(media) && media.length > 0) {
    const m0 = media[0];
    if (typeof m0 === "string") add(m0);
    else if (m0 && typeof m0 === "object" && m0 !== null && "url" in m0) {
      add((m0 as { url?: string }).url);
    }
  }
  return dedupeStrings(out);
}

function vehicleRecallOpenGraphImage(doc: Record<string, unknown> | null): string {
  for (const raw of collectVehicleImageUrlCandidates(doc)) {
    const abs = toAbsoluteOgImage(raw);
    if (abs) return abs;
  }
  return defaultOgImageAbsolute();
}

/** Title/description from Mongo when present (OpenAI rewrite); else defaults. */
export async function buildVehicleRecallMetadata(
  campaignNumber: string,
  lang: string
): Promise<Metadata> {
  const cn = String(campaignNumber ?? "").trim();
  const base = defaultVehicleRecallSeo(cn || "unknown");
  let title = base.seoTitle;
  let description = base.seoDescription;
  let doc: Record<string, unknown> | null = null;
  if (cn) {
    try {
      doc = (await getRecallFromDB(cn)) as Record<string, unknown> | null;
      const st = String(doc?.seoTitle ?? "").trim();
      const sd = String(doc?.seoDescription ?? "").trim();
      if (st) title = st;
      if (sd) description = sd;
    } catch {
      /* Mongo optional at build/runtime */
    }
  }
  const alternates = vehicleRecallAlternates(cn || campaignNumber, lang);
  const canonical =
    typeof alternates.canonical === "string"
      ? alternates.canonical
      : `${getVehicleRecallSiteBaseUrl()}${base.canonicalPath}`;
  const ogImage = vehicleRecallOpenGraphImage(doc);

  return {
    title,
    description,
    alternates,
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
