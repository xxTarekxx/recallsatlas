import { getDb } from "@/lib/mongodb";
import {
  buildRecallsListQuery,
  isValidCategorySlug,
  type RecallCategorySlug,
} from "@/lib/recallCategoryFilter";
import { isSiteUiLang, type SiteUiLang } from "@/lib/siteLocale";

export const DEFAULT_RECALLS_PAGE = 1;
export const DEFAULT_RECALLS_PAGE_SIZE = 8;

export type RecallListItem = {
  _id: string;
  slug: string;
  image: string | { url?: string } | null;
  report_date: string;
  datePublished: string;
  terminated: boolean;
  brandName: string;
  productDescription: string;
  productType: string;
  title: string;
  description: string;
  reason: string;
};

export type RecallListPage = {
  recalls: RecallListItem[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  q: string;
  category: RecallCategorySlug | null;
  lang: SiteUiLang;
};

type RecallListParams = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string | null;
  lang?: string | null;
};

function clampPage(raw: number | undefined): number {
  return Math.max(1, Number.isFinite(raw) ? Math.trunc(raw as number) : DEFAULT_RECALLS_PAGE);
}

function clampLimit(raw: number | undefined): number {
  const base = Number.isFinite(raw) ? Math.trunc(raw as number) : DEFAULT_RECALLS_PAGE_SIZE;
  return Math.min(100, Math.max(1, base || DEFAULT_RECALLS_PAGE_SIZE));
}

function parseLang(raw: string | null | undefined): SiteUiLang {
  return raw && isSiteUiLang(raw) ? raw : "en";
}

function parseCategory(raw: string | null | undefined): RecallCategorySlug | null {
  const normalized = (raw || "").trim().toLowerCase();
  return isValidCategorySlug(normalized) ? normalized : null;
}

function getLocalizedString(source: Record<string, unknown> | null, key: string): string {
  const value = source?.[key];
  return typeof value === "string" ? value : "";
}

function getProjectedImage(doc: Record<string, unknown>): string | { url?: string } | null {
  const image = doc.image;
  if (typeof image === "string" && image.trim()) return image;
  if (image && typeof image === "object") {
    const url = (image as { url?: unknown }).url;
    if (typeof url === "string" && url.trim()) return { url };
  }
  return null;
}

function serializeRecallListItem(doc: Record<string, unknown>, lang: SiteUiLang): RecallListItem {
  const languages =
    doc.languages && typeof doc.languages === "object"
      ? (doc.languages as Record<string, Record<string, unknown>>)
      : {};
  const activeLang = (languages[lang] && typeof languages[lang] === "object"
    ? languages[lang]
    : null) as Record<string, unknown> | null;
  const english = (languages.en && typeof languages.en === "object"
    ? languages.en
    : null) as Record<string, unknown> | null;
  const localized = activeLang ?? english;

  const fallback = (key: string) => {
    const value = doc[key];
    return typeof value === "string" ? value : "";
  };

  return {
    _id: String(doc._id ?? ""),
    slug: fallback("slug"),
    image: getProjectedImage(doc),
    report_date: fallback("report_date"),
    datePublished: fallback("datePublished"),
    terminated: doc.terminated === true,
    brandName:
      getLocalizedString(localized, "brandName") ||
      getLocalizedString(english, "brandName") ||
      fallback("brandName"),
    productDescription:
      getLocalizedString(localized, "productDescription") ||
      getLocalizedString(english, "productDescription") ||
      fallback("productDescription"),
    productType:
      getLocalizedString(localized, "productType") ||
      getLocalizedString(english, "productType") ||
      fallback("productType"),
    title:
      getLocalizedString(localized, "title") ||
      getLocalizedString(localized, "headline") ||
      getLocalizedString(english, "title") ||
      getLocalizedString(english, "headline") ||
      fallback("title") ||
      fallback("headline"),
    description:
      getLocalizedString(localized, "description") ||
      getLocalizedString(english, "description") ||
      fallback("description"),
    reason:
      getLocalizedString(localized, "reason") ||
      getLocalizedString(english, "reason") ||
      fallback("reason"),
  };
}

function buildRecallsProjection(lang: SiteUiLang): Record<string, 1> {
  const projection: Record<string, 1> = {
    slug: 1,
    image: 1,
    report_date: 1,
    datePublished: 1,
    terminated: 1,
    brandName: 1,
    productDescription: 1,
    productType: 1,
    title: 1,
    headline: 1,
    description: 1,
    reason: 1,
    "languages.en.brandName": 1,
    "languages.en.productDescription": 1,
    "languages.en.productType": 1,
    "languages.en.title": 1,
    "languages.en.headline": 1,
    "languages.en.description": 1,
    "languages.en.reason": 1,
  };
  if (lang !== "en") {
    projection[`languages.${lang}.brandName`] = 1;
    projection[`languages.${lang}.productDescription`] = 1;
    projection[`languages.${lang}.productType`] = 1;
    projection[`languages.${lang}.title`] = 1;
    projection[`languages.${lang}.headline`] = 1;
    projection[`languages.${lang}.description`] = 1;
    projection[`languages.${lang}.reason`] = 1;
  }
  return projection;
}

export async function loadRecallsListPage(params: RecallListParams): Promise<RecallListPage> {
  const page = clampPage(params.page);
  const limit = clampLimit(params.limit);
  const q = (params.q || "").trim();
  const category = parseCategory(params.category);
  const lang = parseLang(params.lang);
  const query = buildRecallsListQuery({ q, category });

  const db = await getDb();
  const collection = db.collection("recalls");

  const total =
    Object.keys(query).length === 0
      ? await collection.estimatedDocumentCount()
      : await collection.countDocuments(query);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  const rows = await collection
    .find(query)
    .project(buildRecallsProjection(lang))
    .sort({ report_date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return {
    recalls: rows.map((row: unknown) =>
      serializeRecallListItem(row as Record<string, unknown>, lang)
    ),
    total,
    totalPages,
    page,
    limit,
    q,
    category,
    lang,
  };
}
