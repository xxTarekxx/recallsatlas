/** Pure SEO helpers (no DB) — safe for carDb / carsJson / rewriteRecall. */

const VEHICLE_LANG_CODES = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"] as const;

export function getVehicleRecallSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";
  return raw.replace(/\/+$/, "");
}

export function vehicleRecallDescription(campaignNumber: string): string {
  return `Safety recall ${campaignNumber}. Read risks, affected components, and official remedy.`;
}

/** Default meta + URLs when OpenAI SEO fields are missing. */
export function defaultVehicleRecallSeo(campaignNumber: string) {
  const baseUrl = getVehicleRecallSiteBaseUrl();
  const canonicalPath = `/recalls/vehicle/${campaignNumber}`;
  return {
    seoTitle: `Vehicle Recall ${campaignNumber} | Safety Alert`,
    seoDescription: vehicleRecallDescription(campaignNumber),
    canonicalPath,
    canonicalUrl: `${baseUrl}${canonicalPath}`,
  };
}

/**
 * hreflang / x-default map for static JSON + parity with Metadata alternates.
 */
export function vehicleRecallHreflangUrls(campaignNumber: string): Record<string, string> {
  const baseUrl = getVehicleRecallSiteBaseUrl();
  const enUrl = `${baseUrl}/recalls/vehicle/${campaignNumber}`;
  const out: Record<string, string> = {
    "x-default": enUrl,
    en: enUrl,
  };
  for (const code of VEHICLE_LANG_CODES) {
    if (code === "en") continue;
    out[code] = `${baseUrl}/${code}/recalls/vehicle/${campaignNumber}`;
  }
  return out;
}

/**
 * Ensures canonical + meta fields exist on a vehicle recall record (Mongo or JSON).
 * Preserves non-empty seoTitle / seoDescription from OpenAI rewrite when present.
 */
export function ensureVehicleRecallSeoOnRecord(
  doc: Record<string, unknown>
): Record<string, unknown> {
  const cn = String(doc.campaignNumber ?? "").trim();
  if (!cn) return { ...doc };
  const defaults = defaultVehicleRecallSeo(cn);
  const href = vehicleRecallHreflangUrls(cn);
  const out = { ...doc };
  if (!String(out.canonicalPath ?? "").trim()) out.canonicalPath = defaults.canonicalPath;
  if (!String(out.canonicalUrl ?? "").trim()) out.canonicalUrl = defaults.canonicalUrl;
  if (!String(out.seoTitle ?? "").trim()) out.seoTitle = defaults.seoTitle;
  if (!String(out.seoDescription ?? "").trim()) out.seoDescription = defaults.seoDescription;
  if (
    !out.hreflangUrls ||
    typeof out.hreflangUrls !== "object" ||
    Object.keys(out.hreflangUrls as object).length === 0
  ) {
    out.hreflangUrls = href;
  }
  return out;
}
