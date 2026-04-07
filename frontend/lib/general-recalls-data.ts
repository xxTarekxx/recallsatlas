import fs from "fs";
import path from "path";
import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";
import { isRtlUiLang, isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";

export type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";

/** Translated CPSC “general” recall (from `openaiTranslating/translatedJson` or legacy `generalRecallsTranslated`). */
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
  [key: string]: unknown;
};

export type GeneralRecallFileMeta = {
  slug?: string;
  [key: string]: unknown;
};

export type GeneralRecallDoc = {
  meta?: GeneralRecallFileMeta;
  recalls: GeneralRecall[];
};

function translatedDirCandidates(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "backend", "scripts", "generalRecalls", "openaiTranslating", "translatedJson"),
    path.join(cwd, "..", "backend", "scripts", "generalRecalls", "openaiTranslating", "translatedJson"),
    path.join(cwd, "backend", "scripts", "generalRecalls", "generalRecallsTranslated"),
    path.join(cwd, "..", "backend", "scripts", "generalRecalls", "generalRecallsTranslated"),
  ];
}

export function getGeneralRecallsTranslatedDir(): string | null {
  for (const p of translatedDirCandidates()) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Stable URL segment: prefer top-level `slug`, then legacy `seo.slug`. */
export function getGeneralRecallSlug(recall: GeneralRecall): string | null {
  const top = recall.slug;
  if (typeof top === "string" && top.trim()) return top.trim();
  const legacy = recall.seo?.slug;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
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

function listTranslatedJsonFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "imageUrlMap.json")
    .sort();
}

export function loadGeneralRecallBySlug(slug: string): GeneralRecall | null {
  const dir = getGeneralRecallsTranslatedDir();
  if (!dir) return null;
  for (const file of listTranslatedJsonFiles(dir)) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    let doc: GeneralRecallDoc;
    try {
      doc = JSON.parse(raw) as GeneralRecallDoc;
    } catch {
      continue;
    }
    for (const r of doc.recalls || []) {
      if (getGeneralRecallSlug(r) === slug) return r;
    }
  }
  return null;
}

export function getAllGeneralRecallSlugs(): string[] {
  const m = getGeneralRecallSlugDateMap();
  const out: string[] = [];
  m.forEach((_date, slug) => {
    out.push(slug);
  });
  return out.sort((a, b) => a.localeCompare(b));
}

/** Slug → lastModified for sitemap (dedupes duplicate slugs across files — latest wins). */
export function getGeneralRecallSlugDateMap(): Map<string, Date> {
  const dir = getGeneralRecallsTranslatedDir();
  const map = new Map<string, Date>();
  if (!dir) return map;
  for (const file of listTranslatedJsonFiles(dir)) {
    let doc: GeneralRecallDoc;
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      doc = JSON.parse(raw) as GeneralRecallDoc;
    } catch {
      continue;
    }
    for (const r of doc.recalls || []) {
      const s = getGeneralRecallSlug(r);
      if (!s) continue;
      const lm = getGeneralRecallLastModified(r);
      const prev = map.get(s);
      if (!prev || lm.getTime() > prev.getTime()) map.set(s, lm);
    }
  }
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

function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

let listIndexCache: Map<string, GeneralRecallListItem[]> | null = null;

/** Clears in-memory list cache (e.g. after tests). */
export function clearGeneralRecallListIndexCache(): void {
  listIndexCache = null;
}

function itemDateMs(item: GeneralRecallListItem): number {
  const d = new Date(item.recallDate);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * All general recalls for listing, deduped by slug (latest date wins), newest first.
 * Cached per process; restart the server to pick up JSON changes on disk.
 */
export function loadGeneralRecallListIndex(lang: SiteUiLang = "en"): GeneralRecallListItem[] {
  if (!listIndexCache) listIndexCache = new Map();
  const cached = listIndexCache.get(lang);
  if (cached) return cached;

  const dir = getGeneralRecallsTranslatedDir();
  if (!dir) {
    listIndexCache.set(lang, []);
    return [];
  }
  const bySlug = new Map<string, GeneralRecallListItem>();

  for (const file of listTranslatedJsonFiles(dir)) {
    let doc: GeneralRecallDoc;
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      doc = JSON.parse(raw) as GeneralRecallDoc;
    } catch {
      continue;
    }
    for (const r of doc.recalls || []) {
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

      const item: GeneralRecallListItem = {
        slug,
        title: titleRaw,
        recallDate: rd,
        summary,
        productType,
        brand,
        imageUrl,
        recallNumber,
      };

      const prev = bySlug.get(slug);
      if (!prev || itemDateMs(item) >= itemDateMs(prev)) {
        bySlug.set(slug, item);
      }
    }
  }

  const sorted = Array.from(bySlug.values()).sort((a, b) => itemDateMs(b) - itemDateMs(a));
  listIndexCache.set(lang, sorted);
  return sorted;
}
