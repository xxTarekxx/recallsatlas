import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";
import type { SiteUiLang } from "@/lib/siteLocale";
import {
  buildGeneralRecallDedupeMap,
  clearGeneralRecallSourceCache,
  getGeneralRecallCategoryKey,
  getGeneralRecallSlug,
  getGeneralRecallsTranslatedDir,
  loadFlattenedGeneralRecalls,
  mergeGeneralRecallForUiLang,
  type GeneralRecallListPage,
} from "@/lib/general-recalls-data";

let listIndexCache: Map<string, GeneralRecallListItem[]> | null = null;

function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function itemDateMs(item: GeneralRecallListItem): number {
  const d = new Date(item.recallDate);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function buildListItem(
  recall: Parameters<typeof getGeneralRecallSlug>[0],
  categoryKey: string,
  lang: SiteUiLang
): GeneralRecallListItem | null {
  const slug = getGeneralRecallSlug(recall);
  if (!slug) return null;

  const m = mergeGeneralRecallForUiLang(recall, lang);
  const titleRaw =
    typeof m.Title === "string" && m.Title.trim() ? m.Title.trim() : slug.replace(/-/g, " ");
  const desc = typeof m.Description === "string" ? stripHtml(m.Description) : "";
  const summary = desc.length > 280 ? `${desc.slice(0, 280).trim()}...` : desc;
  const productType =
    (typeof m.Products?.[0]?.Type === "string" && m.Products[0].Type.trim()) ||
    (typeof m.Hazards?.[0]?.Name === "string" && m.Hazards[0].Name.trim()) ||
    "";
  const brand = (typeof m.Products?.[0]?.Name === "string" && m.Products[0].Name.trim()) || "";
  const img0 = recall.Images?.[0]?.URL;
  const imageUrl = typeof img0 === "string" && img0.trim() ? img0.trim() : null;
  const recallDate =
    (typeof recall.RecallDate === "string" && recall.RecallDate.trim()) ||
    (typeof recall.lastTranslatedAt === "string" && recall.lastTranslatedAt.trim()) ||
    "";
  const recallNumber =
    typeof recall.RecallNumber === "string" ? recall.RecallNumber.trim() : "";

  return {
    slug,
    title: titleRaw,
    recallDate,
    summary,
    productType,
    brand,
    imageUrl,
    recallNumber,
    categoryKey,
  };
}

export function clearGeneralRecallListIndexCache(): void {
  listIndexCache = null;
  clearGeneralRecallSourceCache();
}

export function matchesGeneralRecallQuery(item: GeneralRecallListItem, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [item.slug, item.title, item.summary, item.productType, item.brand, item.recallNumber]
    .join(" ")
    .toLowerCase();
  const words = s.split(/\s+/).filter(Boolean);
  return words.every((w) => hay.includes(w));
}

export function loadGeneralRecallListIndex(lang: SiteUiLang = "en"): GeneralRecallListItem[] {
  if (!listIndexCache) listIndexCache = new Map();
  const cached = listIndexCache.get(lang);
  if (cached) return cached;

  const flattened = loadFlattenedGeneralRecalls();
  if (flattened) {
    const items = flattened
      .map((recall) => buildListItem(recall, getGeneralRecallCategoryKey(recall), lang))
      .filter((item): item is GeneralRecallListItem => Boolean(item));
    const sorted = items.sort((a, b) => itemDateMs(b) - itemDateMs(a));
    listIndexCache.set(lang, sorted);
    return sorted;
  }

  const dir = getGeneralRecallsTranslatedDir();
  if (!dir) {
    listIndexCache.set(lang, []);
    return [];
  }

  const items = Array.from(buildGeneralRecallDedupeMap(dir).values())
    .map(({ recall, categoryKey }) => buildListItem(recall, categoryKey, lang))
    .filter((item): item is GeneralRecallListItem => Boolean(item));
  const sorted = items.sort((a, b) => itemDateMs(b) - itemDateMs(a));
  listIndexCache.set(lang, sorted);
  return sorted;
}

export function getGeneralRecallListPage({
  lang = "en",
  q = "",
  page = 1,
  limit = 8,
}: {
  lang?: SiteUiLang;
  q?: string;
  page?: number;
  limit?: number;
}): GeneralRecallListPage {
  const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
  const safeLimit = Math.min(100, Math.max(1, Number.isFinite(limit) ? limit : 8));
  const safeQuery = q.trim();
  const all = loadGeneralRecallListIndex(lang);
  const filtered = safeQuery ? all.filter((it) => matchesGeneralRecallQuery(it, safeQuery)) : all;
  const total = filtered.length;
  const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 1;
  const start = (safePage - 1) * safeLimit;
  const items = filtered.slice(start, start + safeLimit);

  return {
    items,
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
    q: safeQuery,
    lang,
  };
}
