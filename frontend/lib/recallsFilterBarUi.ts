/**
 * FDA recalls list filter bar + shared SearchSuggest strings (navbar language).
 */

import { HOME_COPY } from "@/lib/homeCopy";
import type { RecallCategorySlug } from "@/lib/recallCategoryFilter";
import { VALID_CATEGORY_SLUGS } from "@/lib/recallCategoryFilter";
import type { SiteUiLang } from "@/lib/siteLocale";

const SLUG_TO_FIELD: Record<
  RecallCategorySlug,
  "categoryDrugs" | "categoryFood" | "categoryMedicalDevices" | "categorySupplements"
> = {
  drugs: "categoryDrugs",
  food: "categoryFood",
  "medical-devices": "categoryMedicalDevices",
  supplements: "categorySupplements",
};

export const FILTER_BAR_CATEGORY_SLUGS = VALID_CATEGORY_SLUGS.map((slug) => ({
  slug,
  field: SLUG_TO_FIELD[slug],
}));

export type RecallsFilterBarUi = {
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchButton: string;
  searchSubmitAriaLabel: string;
  searchFieldSrLabel: string;
  loadingSuggestions: string;
  suggestionsAriaLabel: string;
  vinMeta: string;
  brands: string;
  year: string;
  categoryDrugs: string;
  categoryFood: string;
  categoryMedicalDevices: string;
  categorySupplements: string;
  loadingRecallsList: string;
};

const en: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "Search FDA recalls",
  searchButton: "Search",
  searchSubmitAriaLabel: "Submit search",
  searchFieldSrLabel: "Search recalls by headline or product type",
  loadingSuggestions: "Loading…",
  suggestionsAriaLabel: "Search suggestions",
  vinMeta: "VIN · NHTSA",
  brands: "Brands",
  year: "Year",
  categoryDrugs: "Drugs",
  categoryFood: "Food",
  categoryMedicalDevices: "Medical Devices",
  categorySupplements: "Supplements",
  loadingRecallsList: "Loading recalls…",
};

const es: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "Buscar retiros de la FDA",
  searchButton: "Buscar",
  searchSubmitAriaLabel: "Enviar búsqueda",
  searchFieldSrLabel: "Buscar retiros por titular o tipo de producto",
  loadingSuggestions: "Cargando…",
  suggestionsAriaLabel: "Sugerencias de búsqueda",
  vinMeta: "VIN · NHTSA",
  brands: "Marcas",
  year: "Año",
  categoryDrugs: "Medicamentos",
  categoryFood: "Alimentos",
  categoryMedicalDevices: "Dispositivos médicos",
  categorySupplements: "Suplementos",
  loadingRecallsList: "Cargando retiros…",
};

const ar: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "البحث في استدعاءات FDA",
  searchButton: "بحث",
  searchSubmitAriaLabel: "إرسال البحث",
  searchFieldSrLabel: "البحث في الاستدعاءات حسب العنوان أو نوع المنتج",
  loadingSuggestions: "جارٍ التحميل…",
  suggestionsAriaLabel: "اقتراحات البحث",
  vinMeta: "رقم الهيكل · NHTSA",
  brands: "العلامات التجارية",
  year: "السنة",
  categoryDrugs: "أدوية",
  categoryFood: "أغذية",
  categoryMedicalDevices: "أجهزة طبية",
  categorySupplements: "مكملات غذائية",
  loadingRecallsList: "جارٍ تحميل الاستدعاءات…",
};

const zh: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "搜索 FDA 召回",
  searchButton: "搜索",
  searchSubmitAriaLabel: "提交搜索",
  searchFieldSrLabel: "按标题或产品类型搜索召回",
  loadingSuggestions: "加载中…",
  suggestionsAriaLabel: "搜索建议",
  vinMeta: "车辆识别码 · NHTSA",
  brands: "品牌",
  year: "年份",
  categoryDrugs: "药品",
  categoryFood: "食品",
  categoryMedicalDevices: "医疗器械",
  categorySupplements: "膳食补充剂",
  loadingRecallsList: "正在加载召回…",
};

const fr: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "Rechercher des rappels FDA",
  searchButton: "Rechercher",
  searchSubmitAriaLabel: "Lancer la recherche",
  searchFieldSrLabel: "Rechercher des rappels par titre ou type de produit",
  loadingSuggestions: "Chargement…",
  suggestionsAriaLabel: "Suggestions de recherche",
  vinMeta: "NIV · NHTSA",
  brands: "Marques",
  year: "Année",
  categoryDrugs: "Médicaments",
  categoryFood: "Aliments",
  categoryMedicalDevices: "Dispositifs médicaux",
  categorySupplements: "Compléments",
  loadingRecallsList: "Chargement des rappels…",
};

const de: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "FDA-Rückrufe durchsuchen",
  searchButton: "Suchen",
  searchSubmitAriaLabel: "Suche absenden",
  searchFieldSrLabel: "Rückrufe nach Überschrift oder Produkttyp suchen",
  loadingSuggestions: "Laden…",
  suggestionsAriaLabel: "Suchvorschläge",
  vinMeta: "FIN · NHTSA",
  brands: "Marken",
  year: "Jahr",
  categoryDrugs: "Arzneimittel",
  categoryFood: "Lebensmittel",
  categoryMedicalDevices: "Medizinprodukte",
  categorySupplements: "Nahrungsergänzung",
  loadingRecallsList: "Rückrufe werden geladen…",
};

const ja: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "FDAリコールを検索",
  searchButton: "検索",
  searchSubmitAriaLabel: "検索を実行",
  searchFieldSrLabel: "見出しまたは製品タイプでリコールを検索",
  loadingSuggestions: "読み込み中…",
  suggestionsAriaLabel: "検索候補",
  vinMeta: "車台番号 · NHTSA",
  brands: "ブランド",
  year: "年",
  categoryDrugs: "医薬品",
  categoryFood: "食品",
  categoryMedicalDevices: "医療機器",
  categorySupplements: "サプリメント",
  loadingRecallsList: "リコールを読み込み中…",
};

const pt: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "Pesquisar recalls da FDA",
  searchButton: "Pesquisar",
  searchSubmitAriaLabel: "Enviar pesquisa",
  searchFieldSrLabel: "Pesquisar recalls por título ou tipo de produto",
  loadingSuggestions: "Carregando…",
  suggestionsAriaLabel: "Sugestões de pesquisa",
  vinMeta: "VIN · NHTSA",
  brands: "Marcas",
  year: "Ano",
  categoryDrugs: "Medicamentos",
  categoryFood: "Alimentos",
  categoryMedicalDevices: "Dispositivos médicos",
  categorySupplements: "Suplementos",
  loadingRecallsList: "Carregando recalls…",
};

const hi: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "FDA रिकॉल खोजें",
  searchButton: "खोजें",
  searchSubmitAriaLabel: "खोज सबमिट करें",
  searchFieldSrLabel: "शीर्षक या उत्पाद प्रकार से रिकॉल खोजें",
  loadingSuggestions: "लोड हो रहा है…",
  suggestionsAriaLabel: "खोज सुझाव",
  vinMeta: "VIN · NHTSA",
  brands: "ब्रांड",
  year: "वर्ष",
  categoryDrugs: "दवाइयाँ",
  categoryFood: "खाद्य",
  categoryMedicalDevices: "चिकित्सा उपकरण",
  categorySupplements: "पूरक",
  loadingRecallsList: "रिकॉल लोड हो रहे हैं…",
};

const ru: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "Поиск отзывов FDA",
  searchButton: "Найти",
  searchSubmitAriaLabel: "Отправить запрос",
  searchFieldSrLabel: "Поиск отзывов по заголовку или типу продукта",
  loadingSuggestions: "Загрузка…",
  suggestionsAriaLabel: "Подсказки поиска",
  vinMeta: "VIN · NHTSA",
  brands: "Бренды",
  year: "Год",
  categoryDrugs: "Лекарства",
  categoryFood: "Продукты питания",
  categoryMedicalDevices: "Медицинские изделия",
  categorySupplements: "Биодобавки",
  loadingRecallsList: "Загрузка отзывов…",
};

const vi: Omit<RecallsFilterBarUi, "searchPlaceholder"> = {
  searchAriaLabel: "Tìm thu hồi FDA",
  searchButton: "Tìm",
  searchSubmitAriaLabel: "Gửi tìm kiếm",
  searchFieldSrLabel: "Tìm thu hồi theo tiêu đề hoặc loại sản phẩm",
  loadingSuggestions: "Đang tải…",
  suggestionsAriaLabel: "Gợi ý tìm kiếm",
  vinMeta: "VIN · NHTSA",
  brands: "Thương hiệu",
  year: "Năm",
  categoryDrugs: "Thuốc",
  categoryFood: "Thực phẩm",
  categoryMedicalDevices: "Thiết bị y tế",
  categorySupplements: "Thực phẩm bổ sung",
  loadingRecallsList: "Đang tải danh sách thu hồi…",
};

const BY_LANG: Record<SiteUiLang, Omit<RecallsFilterBarUi, "searchPlaceholder">> = {
  en,
  es,
  ar,
  zh,
  fr,
  de,
  ja,
  pt,
  hi,
  ru,
  vi,
};

export function getRecallsFilterBarUi(lang: SiteUiLang): RecallsFilterBarUi {
  return {
    searchPlaceholder: HOME_COPY[lang].searchPlaceholder,
    ...BY_LANG[lang],
  };
}
