import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";
import { isRtlUiLang, isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";
import { getMongoDb } from "@/lib/mongo";

export type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";

/** Translated CPSC “general” recall. Loaded from Mongo `recallsatlas.general`. */
export type GeneralRecallImage = {
  URL?: string;
  Caption?: string;
  SourceImageURL?: string;
  ImageFetchFailed?: boolean;
};

export type GeneralRecall = {
  slug?: string;
  /** @deprecated Removed from JSON after strip-legacy-seo; optional read fallback only */
  seo?: { slug?: string; metaDescription?: string };
  metaDescription?: string;
  /** ISO timestamp when translate / retailers-only / image-retry last wrote this recall */
  lastTranslatedAt?: string;
  RecallNumber?: string;
  RecallDate?: string;
  Title?: string;
  Description?: string;
  URL?: string;
  ConsumerContact?: string;
  Products?: { Name?: string; Model?: string; Type?: string; NumberOfUnits?: string }[];
  Images?: GeneralRecallImage[];
  Hazards?: { Name?: string }[];
  Remedies?: { Name?: string }[];
  Retailers?: { Name?: string }[];
  Injuries?: { Name?: string }[];
  /** Per-UI-lang copy from OpenAI i18n (same shape as top-level fields; Images are usually caption-only). */
  languages?: Record<string, Record<string, unknown>>;
  /** Set when loading from mongo: category slug (one document per category). */
  sourceCategoryKey?: string;
  [key: string]: unknown;
};

export type GeneralRecallFileMeta = {
  slug?: string;
  [key: string]: unknown;
};

export type GeneralRecallDoc = {
  categorySlug?: string;
  meta?: GeneralRecallFileMeta;
  recalls: GeneralRecall[];
};

/** Shape of `general` collection rows from Mongo (fields may be absent until validated). */
type GeneralCategoryMongoDoc = Omit<GeneralRecallDoc, "recalls"> & {
  recalls?: GeneralRecall[];
};

/** Stable URL segment: prefer top-level `slug`, then legacy `seo.slug`. */
export function getGeneralRecallSlug(recall: GeneralRecall): string | null {
  const top = recall.slug;
  if (typeof top === "string" && top.trim()) return top.trim();
  const legacy = recall.seo?.slug;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

/**
 * One key per real-world recall so category JSON duplicates (same CPSC recall in multiple files
 * with different `slug`) collapse to a single list row / sitemap entry.
 *
 * Mongo / JSON may store RecallID as number or string; normalize so the same CPSC row does not
 * become multiple pagination entries.
 */
export function getGeneralRecallDedupeKey(recall: GeneralRecall): string {
  const rnRaw = recall.RecallNumber;
  if (typeof rnRaw === "number" && Number.isFinite(rnRaw)) {
    return `rn:${String(rnRaw)}`;
  }
  if (typeof rnRaw === "string" && rnRaw.trim()) {
    return `rn:${rnRaw.trim()}`;
  }

  const idRaw = recall.RecallID;
  if (idRaw != null && idRaw !== "") {
    const idNum = typeof idRaw === "number" ? idRaw : Number(String(idRaw).trim());
    if (Number.isFinite(idNum)) return `id:${idNum}`;
  }

  const u = typeof recall.URL === "string" ? recall.URL.trim() : "";
  if (u) return `url:${u}`;
  const slug = getGeneralRecallSlug(recall);
  return slug ? `slug:${slug}` : "";
}

function langPackForUi(recall: GeneralRecall, lang: SiteUiLang): Record<string, unknown> | null {
  const raw =
    lang === "en"
      ? recall.languages?.en
      : recall.languages?.[lang] ?? recall.languages?.en;
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

/** Merge `recall.languages[lang]` (and English fallback) onto the canonical recall for display / list rows. */
export function mergeGeneralRecallForUiLang(recall: GeneralRecall, lang: SiteUiLang): GeneralRecall {
  const pack = langPackForUi(recall, lang);
  if (!pack) return recall;
  const merged: GeneralRecall = { ...recall };

  const assignStr = (key: keyof GeneralRecall) => {
    const v = pack[key as string];
    if (typeof v === "string" && v.trim()) (merged as Record<string, unknown>)[key as string] = v;
  };
  assignStr("Title");
  assignStr("Description");
  assignStr("ConsumerContact");
  assignStr("metaDescription");

  const assignArr = (key: keyof GeneralRecall) => {
    const v = pack[key as string];
    if (Array.isArray(v) && v.length) (merged as Record<string, unknown>)[key as string] = v;
  };
  assignArr("Products");
  assignArr("Hazards");
  assignArr("Remedies");
  assignArr("Retailers");
  assignArr("Injuries");

  const baseIm = recall.Images;
  const packIm = pack.Images;
  if (Array.isArray(baseIm) && baseIm.length && Array.isArray(packIm) && packIm.length) {
    merged.Images = baseIm.map((img, i) => {
      const pi = packIm[i] as { Caption?: string } | undefined;
      const cap = pi?.Caption;
      return typeof cap === "string" && cap.trim() ? { ...img, Caption: cap } : img;
    });
  }

  return merged;
}

/** Text direction for recall body (from i18n pack `dir`, else RTL UI langs). */
export function getGeneralRecallContentDir(recall: GeneralRecall, lang: SiteUiLang): "ltr" | "rtl" {
  const pack = langPackForUi(recall, lang);
  if (pack) {
    const d = pack.dir;
    if (d === "rtl" || d === "ltr") return d;
  }
  return isRtlUiLang(lang) ? "rtl" : "ltr";
}

export function parseGeneralRecallListLang(param: string | null | undefined): SiteUiLang {
  if (param && isSiteUiLang(param)) return param;
  return "en";
}

type GeneralRecallDedupeEntry = { recall: GeneralRecall; categoryKey: string };

/** Max time any single Mongo operation is allowed to run. */
const GENERAL_QUERY_TIMEOUT_MS = 55000;

/**
 * Full fetch — used by the detail page (needs all translations, images, etc.).
 * Not called on the list or sitemap hot paths.
 */
async function loadGeneralRecallDocsFromMongo(): Promise<GeneralCategoryMongoDoc[]> {
  const db = await getMongoDb();
  return db
    .collection<GeneralCategoryMongoDoc>("general")
    .find(
      {},
      {
        projection: {
          categorySlug: 1,
          meta: 1,
          recalls: 1,
          _id: 0,
        },
      }
    )
    .maxTimeMS(GENERAL_QUERY_TIMEOUT_MS)
    .toArray();
}

/**
 * Lightweight fetch for the **list page** — projects only the fields a list card needs,
 * and only the language packs for `lang` (+ English as fallback).
 * Dramatically reduces wire size vs. loading all translations for every recall.
 */
async function loadGeneralRecallListDataFromMongo(lang: SiteUiLang): Promise<GeneralCategoryMongoDoc[]> {
  const db = await getMongoDb();

  // Fields needed for dedup keys, dates, and list-card display
  const projection: Record<string, unknown> = {
    categorySlug: 1,
    "recalls.slug": 1,
    "recalls.seo.slug": 1,
    "recalls.RecallNumber": 1,
    "recalls.RecallID": 1,
    "recalls.URL": 1,
    "recalls.RecallDate": 1,
    "recalls.lastTranslatedAt": 1,
    "recalls.LastPublishDate": 1,
    // Base English fields
    "recalls.Title": 1,
    "recalls.Description": 1,
    "recalls.Products.Name": 1,
    "recalls.Products.Type": 1,
    "recalls.Hazards.Name": 1,
    "recalls.Images.URL": 1,
    // English language pack (needed as fallback for all langs)
    "recalls.languages.en.Title": 1,
    "recalls.languages.en.Description": 1,
    "recalls.languages.en.Products": 1,
    "recalls.languages.en.Hazards": 1,
    _id: 0,
  };

  // Add the requested non-English language pack if different from English
  if (lang !== "en") {
    projection[`recalls.languages.${lang}.Title`] = 1;
    projection[`recalls.languages.${lang}.Description`] = 1;
    projection[`recalls.languages.${lang}.Products`] = 1;
    projection[`recalls.languages.${lang}.Hazards`] = 1;
  }

  return db
    .collection<GeneralCategoryMongoDoc>("general")
    .find({}, { projection })
    .maxTimeMS(GENERAL_QUERY_TIMEOUT_MS)
    .toArray();
}

/**
 * Minimal fetch for the **sitemap** — only slug and date fields.
 * No content, no translations needed.
 */
async function loadGeneralRecallSitemapDataFromMongo(): Promise<GeneralCategoryMongoDoc[]> {
  const db = await getMongoDb();
  return db
    .collection<GeneralCategoryMongoDoc>("general")
    .find(
      {},
      {
        projection: {
          categorySlug: 1,
          "recalls.slug": 1,
          "recalls.seo.slug": 1,
          "recalls.RecallNumber": 1,
          "recalls.RecallID": 1,
          "recalls.URL": 1,
          "recalls.RecallDate": 1,
          "recalls.lastTranslatedAt": 1,
          "recalls.LastPublishDate": 1,
          _id: 0,
        },
      }
    )
    .maxTimeMS(GENERAL_QUERY_TIMEOUT_MS)
    .toArray();
}

/** Merge rows across category documents; `categoryKey` follows the winning row’s source category. */
function buildGeneralRecallDedupeMap(docs: GeneralCategoryMongoDoc[]): Map<string, GeneralRecallDedupeEntry> {
  const byDedupe = new Map<string, GeneralRecallDedupeEntry>();
  for (const doc of docs) {
    const stem = typeof doc.categorySlug === "string" && doc.categorySlug.trim() ? doc.categorySlug : "general";
    for (const r of doc.recalls || []) {
      const key = getGeneralRecallDedupeKey(r);
      if (!key) continue;
      const prev = byDedupe.get(key);
      if (!prev) {
        byDedupe.set(key, { recall: r, categoryKey: stem });
      } else {
        const winner = pickNewerGeneralRecallRow(prev.recall, r);
        const categoryKey = winner === r ? stem : prev.categoryKey;
        byDedupe.set(key, { recall: winner, categoryKey });
      }
    }
  }
  return byDedupe;
}

export async function loadGeneralRecallBySlug(slug: string): Promise<GeneralRecall | null> {
  const docs = await loadGeneralRecallDocsFromMongo();
  for (const doc of docs) {
    const stem = typeof doc.categorySlug === "string" && doc.categorySlug.trim() ? doc.categorySlug : "general";
    for (const r of doc.recalls || []) {
      if (getGeneralRecallSlug(r) === slug) return { ...r, sourceCategoryKey: stem };
    }
  }
  return null;
}

export async function getAllGeneralRecallSlugs(): Promise<string[]> {
  const m = await getGeneralRecallSlugDateMap();
  const out: string[] = [];
  m.forEach((_date, slug) => {
    out.push(slug);
  });
  return out.sort((a, b) => a.localeCompare(b));
}

type SlugDateCacheEntry = { map: Map<string, Date>; fetchedAt: number };
/** 1-hour TTL — sitemap regenerates infrequently. */
const SLUG_DATE_CACHE_TTL_MS = 60 * 60 * 1000;
let slugDateCache: SlugDateCacheEntry | null = null;

/** Slug → lastModified for sitemap (one slug per CPSC recall; duplicate category files deduped). */
export async function getGeneralRecallSlugDateMap(): Promise<Map<string, Date>> {
  const now = Date.now();
  if (slugDateCache && now - slugDateCache.fetchedAt < SLUG_DATE_CACHE_TTL_MS) {
    return slugDateCache.map;
  }

  const map = new Map<string, Date>();
  // Use lightweight sitemap projection — no content, no translations needed here.
  const docs = await loadGeneralRecallSitemapDataFromMongo();
  const byDedupe = buildGeneralRecallDedupeMap(docs);
  for (const { recall: r } of Array.from(byDedupe.values())) {
    const s = getGeneralRecallSlug(r);
    if (!s) continue;
    const lm = getGeneralRecallLastModified(r);
    const prev = map.get(s);
    if (!prev || lm.getTime() > prev.getTime()) map.set(s, lm);
  }
  slugDateCache = { map, fetchedAt: now };
  return map;
}

export function getGeneralRecallLastModified(recall: GeneralRecall): Date {
  const candidates = [recall.lastTranslatedAt, recall.LastPublishDate, recall.RecallDate];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

function countGeneralRecallLangKeys(recall: GeneralRecall): number {
  if (!recall.languages || typeof recall.languages !== "object") return 0;
  return Object.keys(recall.languages).length;
}

/** When two JSON rows are the same CPSC recall, keep the freshest / most-complete row for canonical URL. */
function pickNewerGeneralRecallRow(a: GeneralRecall, b: GeneralRecall): GeneralRecall {
  const ta = getGeneralRecallLastModified(a).getTime();
  const tb = getGeneralRecallLastModified(b).getTime();
  if (ta !== tb) return ta > tb ? a : b;
  const la = countGeneralRecallLangKeys(a);
  const lb = countGeneralRecallLangKeys(b);
  if (la !== lb) return la > lb ? a : b;
  const sa = getGeneralRecallSlug(a) || "";
  const sb = getGeneralRecallSlug(b) || "";
  return sa <= sb ? a : b;
}

function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type ListCacheEntry = { items: GeneralRecallListItem[]; fetchedAt: number };
/** 30-minute TTL — balances freshness vs. cold-start cost. */
const LIST_CACHE_TTL_MS = 30 * 60 * 1000;
let listIndexCache: Map<string, ListCacheEntry> | null = null;

/** Clears in-memory list and slug-date caches (e.g. after tests or forced refresh). */
export function clearGeneralRecallListIndexCache(): void {
  listIndexCache = null;
  slugDateCache = null;
}

function itemDateMs(item: GeneralRecallListItem): number {
  const d = new Date(item.recallDate);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * All general recalls for listing, deduped by CPSC identity (RecallNumber, else RecallID/URL/slug),
 * then one canonical slug per recall (newest row wins). Newest first.
 *
 * Uses a lightweight per-lang MongoDB projection so the cold-start fetch is fast.
 * Results are cached for LIST_CACHE_TTL_MS; cache survives across requests within the same process.
 */
export async function loadGeneralRecallListIndex(lang: SiteUiLang = "en"): Promise<GeneralRecallListItem[]> {
  if (!listIndexCache) listIndexCache = new Map();
  const now = Date.now();
  const cached = listIndexCache.get(lang);
  // Return cached entry if still within TTL
  if (cached && now - cached.fetchedAt < LIST_CACHE_TTL_MS) return cached.items;

  // Use the lightweight list projection for this lang (much smaller than full docs)
  const docs = await loadGeneralRecallListDataFromMongo(lang);
  const byDedupe = buildGeneralRecallDedupeMap(docs);

  const items: GeneralRecallListItem[] = [];
  for (const { recall: r, categoryKey } of Array.from(byDedupe.values())) {
    const slug = getGeneralRecallSlug(r);
    if (!slug) continue;

    const m = mergeGeneralRecallForUiLang(r, lang);
    const titleRaw = typeof m.Title === "string" && m.Title.trim() ? m.Title.trim() : slug.replace(/-/g, " ");
    const desc = typeof m.Description === "string" ? stripHtml(m.Description) : "";
    const summary = desc.length > 280 ? `${desc.slice(0, 280).trim()}…` : desc;

    const productType =
      (typeof m.Products?.[0]?.Type === "string" && m.Products[0].Type.trim()) ||
      (typeof m.Hazards?.[0]?.Name === "string" && m.Hazards[0].Name.trim()) ||
      "";
    const brand =
      (typeof m.Products?.[0]?.Name === "string" && m.Products[0].Name.trim()) || "";
    const img0 = r.Images?.[0]?.URL;
    const imageUrl = typeof img0 === "string" && img0.trim() ? img0.trim() : null;
    const rd =
      (typeof r.RecallDate === "string" && r.RecallDate.trim()) ||
      (typeof r.lastTranslatedAt === "string" && r.lastTranslatedAt.trim()) ||
      "";
    const recallNumber = typeof r.RecallNumber === "string" ? r.RecallNumber.trim() : "";

    items.push({
      slug,
      title: titleRaw,
      recallDate: rd,
      summary,
      productType,
      brand,
      imageUrl,
      recallNumber,
      categoryKey,
    });
  }

  const sorted = items.sort((a, b) => itemDateMs(b) - itemDateMs(a));
  listIndexCache.set(lang, { items: sorted, fetchedAt: now });
  return sorted;
}
