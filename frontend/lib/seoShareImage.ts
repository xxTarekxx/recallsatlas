import { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeoDefaults";

/** Order-preserving dedupe without spreading a Set (keeps TS happy with ES5-ish targets). */
export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (seen.has(v)) continue;
    seen.add(v);
    result.push(v);
  }
  return result;
}

/** Fallback when a recall has no suitable image (existing public asset). */
export const DEFAULT_OG_IMAGE_PATH = "/images/logo/globe.webp";

/** Turn a stored recall image URL into an absolute https URL for OG/Twitter. */
export function toAbsoluteOgImage(url: string): string | undefined {
  const baseUrl = getVehicleRecallSiteBaseUrl();
  const u = String(url || "").trim();
  if (!u || u.startsWith("data:")) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${baseUrl}${u}`;
  return undefined;
}

export function defaultOgImageAbsolute(): string {
  return `${getVehicleRecallSiteBaseUrl()}${DEFAULT_OG_IMAGE_PATH}`;
}
