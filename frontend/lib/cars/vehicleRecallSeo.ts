import type { Metadata } from "next";

/** Vehicle recall SEO languages (hreflang + routes). */
const VEHICLE_LANG_CODES = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"] as const;

export function getVehicleRecallSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";
  return raw.replace(/\/+$/, "");
}

export function vehicleRecallDescription(campaignNumber: string): string {
  return `Safety recall ${campaignNumber}. Read risks, affected components, and official remedy.`;
}

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
