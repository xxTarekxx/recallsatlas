import type { MetadataRoute } from "next";
import { getDb } from "@/lib/mongodb";
import { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeo";

/** Always read current Mongo slugs (avoid stale build/CDN cache after sync). */
export const dynamic = "force-dynamic";

/** Must match vehicle + FDA localized routes; English has no /en/ prefix. */
const SITEMAP_LANGS = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"] as const;

const FDA_SITEMAP_PRIORITY = 0.8;
const VEHICLE_SITEMAP_PRIORITY = 0.7;
const STATIC_HOME_PRIORITY = 1;
const STATIC_SECTION_PRIORITY = 0.85;

/**
 * Never use distinct("slug") / distinct("campaignNumber") without these guards.
 * Require present, non-null, non-empty string before sitemap URLs.
 */
const FDA_RECALLS_SITEMAP_QUERY = {
  $and: [
    { slug: { $exists: true } },
    { slug: { $ne: null } },
    { slug: { $ne: "" } },
  ],
} as const;

const VEHICLE_CARS_SITEMAP_QUERY = {
  $and: [
    { campaignNumber: { $exists: true } },
    { campaignNumber: { $ne: null } },
    { campaignNumber: { $ne: "" } },
  ],
} as const;

/** Only fields needed for sitemap URLs + lastModified (keeps wire + memory small). */
const FDA_RECALLS_SITEMAP_PROJECTION = {
  slug: 1,
  dateModified: 1,
  datePublished: 1,
  _id: 0,
} as const;

const VEHICLE_CARS_SITEMAP_PROJECTION = {
  campaignNumber: 1,
  reportReceivedDate: 1,
  reportDate: 1,
  updatedAt: 1,
  createdAt: 1,
  _id: 0,
} as const;

/** Server cursor batch size — avoids loading full result set in one buffer. */
const SITEMAP_CURSOR_BATCH_SIZE = 500;

/** Google’s per-sitemap URL cap (optional warning only; split sitemaps if you exceed). */
const GOOGLE_SITEMAP_MAX_URLS = 50_000;

/**
 * Deterministic key order — always sort; do not iterate the Map directly (insertion order is not a contract we rely on).
 */
function sortedMapKeys(map: Map<string, Date>): string[] {
  return Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
}

function parseRecallDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;
  // YYYYMMDD (e.g. report_date)
  if (/^\d{8}$/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const day = s.slice(6, 8);
    const d = new Date(`${y}-${m}-${day}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fdaLastModified(doc: { dateModified?: unknown; datePublished?: unknown }): Date {
  return (
    parseRecallDate(doc.dateModified) ??
    parseRecallDate(doc.datePublished) ??
    new Date()
  );
}

function vehicleLastModified(doc: {
  reportReceivedDate?: unknown;
  reportDate?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
}): Date {
  return (
    parseRecallDate(doc.reportReceivedDate) ??
    parseRecallDate(doc.reportDate) ??
    parseRecallDate(doc.updatedAt) ??
    parseRecallDate(doc.createdAt) ??
    new Date()
  );
}

async function fetchFdaSlugDates(): Promise<Map<string, Date>> {
  try {
    const db = await getDb();
    const cursor = db.collection("recalls").find(FDA_RECALLS_SITEMAP_QUERY, {
      projection: FDA_RECALLS_SITEMAP_PROJECTION,
      batchSize: SITEMAP_CURSOR_BATCH_SIZE,
    });

    const bySlug = new Map<string, Date>();
    for await (const doc of cursor) {
      const slug = String((doc as { slug?: string }).slug || "").trim();
      if (!slug) continue;
      const lm = fdaLastModified(doc as { dateModified?: unknown; datePublished?: unknown });
      const prev = bySlug.get(slug);
      if (!prev || lm.getTime() > prev.getTime()) {
        bySlug.set(slug, lm);
      }
    }
    return bySlug;
  } catch (e) {
    console.error("[sitemap] FDA recalls fetch failed:", e);
    return new Map();
  }
}

async function fetchVehicleCampaignDates(): Promise<Map<string, Date>> {
  try {
    const db = await getDb();
    const cursor = db.collection("cars").find(VEHICLE_CARS_SITEMAP_QUERY, {
      projection: VEHICLE_CARS_SITEMAP_PROJECTION,
      batchSize: SITEMAP_CURSOR_BATCH_SIZE,
    });

    const byCampaign = new Map<string, Date>();
    for await (const doc of cursor) {
      const cn = String((doc as { campaignNumber?: string }).campaignNumber || "").trim();
      if (!cn) continue;
      const lm = vehicleLastModified(
        doc as {
          reportReceivedDate?: unknown;
          reportDate?: unknown;
          updatedAt?: unknown;
          createdAt?: unknown;
        }
      );
      const prev = byCampaign.get(cn);
      if (!prev || lm.getTime() > prev.getTime()) {
        byCampaign.set(cn, lm);
      }
    }
    return byCampaign;
  } catch (e) {
    console.error("[sitemap] vehicle recalls fetch failed:", e);
    return new Map();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getVehicleRecallSiteBaseUrl();

  const [fdaBySlug, vehicleByCampaign] = await Promise.all([
    fetchFdaSlugDates(),
    fetchVehicleCampaignDates(),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  const staticNow = new Date();
  for (const lang of SITEMAP_LANGS) {
    const home = lang === "en" ? base : `${base}/${lang}`;
    const about = lang === "en" ? `${base}/about` : `${base}/${lang}/about`;
    const recallsList = lang === "en" ? `${base}/recalls` : `${base}/${lang}/recalls`;
    const carsList = lang === "en" ? `${base}/cars` : `${base}/${lang}/cars`;
    const staticPairs: { url: string; priority: number }[] = [
      { url: home, priority: STATIC_HOME_PRIORITY },
      { url: about, priority: STATIC_SECTION_PRIORITY },
      { url: recallsList, priority: STATIC_SECTION_PRIORITY },
      { url: carsList, priority: STATIC_SECTION_PRIORITY },
    ];
    for (const { url, priority } of staticPairs) {
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push({ url, lastModified: staticNow, priority });
    }
  }

  const fdaSlugs = sortedMapKeys(fdaBySlug);
  for (const slug of fdaSlugs) {
    const lastModified = fdaBySlug.get(slug) ?? new Date();
    const enc = encodeURIComponent(slug);
    for (const lang of SITEMAP_LANGS) {
      const url =
        lang === "en" ? `${base}/recalls/${enc}` : `${base}/${lang}/recalls/${enc}`;
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push({ url, lastModified, priority: FDA_SITEMAP_PRIORITY });
    }
  }

  const campaigns = sortedMapKeys(vehicleByCampaign);
  for (const campaignNumber of campaigns) {
    const lastModified = vehicleByCampaign.get(campaignNumber) ?? new Date();
    const enc = encodeURIComponent(campaignNumber);
    for (const lang of SITEMAP_LANGS) {
      const url =
        lang === "en"
          ? `${base}/recalls/vehicle/${enc}`
          : `${base}/${lang}/recalls/vehicle/${enc}`;
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push({ url, lastModified, priority: VEHICLE_SITEMAP_PRIORITY });
    }
  }

  if (entries.length > GOOGLE_SITEMAP_MAX_URLS) {
    console.warn(
      `[sitemap] Sitemap has ${entries.length} URLs (Google limit ${GOOGLE_SITEMAP_MAX_URLS} per file). Consider splitting into multiple sitemaps.`
    );
  }

  return entries;
}
