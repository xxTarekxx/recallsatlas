import type { Metadata } from "next";
import { getRecallFromDB } from "@/lib/cars/carDb";
import {
  defaultVehicleRecallSeo,
  getVehicleRecallSiteBaseUrl,
} from "@/lib/cars/vehicleRecallSeoDefaults";

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

/** Title/description from Mongo when present (OpenAI rewrite); else defaults. */
export async function buildVehicleRecallMetadata(
  campaignNumber: string,
  lang: string
): Promise<Metadata> {
  const cn = String(campaignNumber ?? "").trim();
  const base = defaultVehicleRecallSeo(cn || "unknown");
  let title = base.seoTitle;
  let description = base.seoDescription;
  if (cn) {
    try {
      const doc = (await getRecallFromDB(cn)) as Record<string, unknown> | null;
      const st = String(doc?.seoTitle ?? "").trim();
      const sd = String(doc?.seoDescription ?? "").trim();
      if (st) title = st;
      if (sd) description = sd;
    } catch {
      /* Mongo optional at build/runtime */
    }
  }
  return {
    title,
    description,
    alternates: vehicleRecallAlternates(cn || campaignNumber, lang),
  };
}
