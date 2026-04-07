import type { SiteUiLang } from "@/lib/siteLocale";

export type GeneralRecallsSearchUi = {
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchButton: string;
  searchSubmitAriaLabel: string;
  searchFieldSrLabel: string;
  loadingSuggestions: string;
  suggestionsAriaLabel: string;
  loadingList: string;
};

export const GENERAL_RECALLS_SEARCH_UI: Record<SiteUiLang, GeneralRecallsSearchUi> = {
  en: {
    searchPlaceholder: "Search by title, product, or recall number…",
    searchAriaLabel: "Search consumer product recalls",
    searchButton: "Search",
    searchSubmitAriaLabel: "Submit search",
    searchFieldSrLabel: "Search CPSC consumer recalls by title or keywords",
    loadingSuggestions: "Loading…",
    suggestionsAriaLabel: "Search suggestions",
    loadingList: "Loading recalls…",
  },
  es: {
    searchPlaceholder: "Buscar por título, producto o número…",
    searchAriaLabel: "Buscar retiros de productos de consumo",
    searchButton: "Buscar",
    searchSubmitAriaLabel: "Enviar búsqueda",
    searchFieldSrLabel: "Buscar retiros CPSC por título o palabras clave",
    loadingSuggestions: "Cargando…",
    suggestionsAriaLabel: "Sugerencias",
    loadingList: "Cargando retiros…",
  },
  ar: {
    searchPlaceholder: "ابحث بالعنوان أو المنتج أو الرقم…",
    searchAriaLabel: "البحث في استدعاءات المنتجات",
    searchButton: "بحث",
    searchSubmitAriaLabel: "إرسال البحث",
    searchFieldSrLabel: "البحث في استدعاءات المستهلك",
    loadingSuggestions: "جارٍ التحميل…",
    suggestionsAriaLabel: "اقتراحات",
    loadingList: "جارٍ التحميل…",
  },
  zh: {
    searchPlaceholder: "按标题、产品或召回编号搜索…",
    searchAriaLabel: "搜索消费品召回",
    searchButton: "搜索",
    searchSubmitAriaLabel: "提交搜索",
    searchFieldSrLabel: "按标题或关键词搜索 CPSC 消费品召回",
    loadingSuggestions: "加载中…",
    suggestionsAriaLabel: "搜索建议",
    loadingList: "正在加载召回…",
  },
  fr: {
    searchPlaceholder: "Rechercher par titre, produit ou numéro…",
    searchAriaLabel: "Rechercher des rappels produits",
    searchButton: "Rechercher",
    searchSubmitAriaLabel: "Envoyer la recherche",
    searchFieldSrLabel: "Rechercher des rappels CPSC",
    loadingSuggestions: "Chargement…",
    suggestionsAriaLabel: "Suggestions",
    loadingList: "Chargement des rappels…",
  },
  de: {
    searchPlaceholder: "Suche nach Titel, Produkt oder Nummer…",
    searchAriaLabel: "Verbraucher-Rückrufe suchen",
    searchButton: "Suchen",
    searchSubmitAriaLabel: "Suche absenden",
    searchFieldSrLabel: "CPSC-Rückrufe durchsuchen",
    loadingSuggestions: "Laden…",
    suggestionsAriaLabel: "Vorschläge",
    loadingList: "Rückrufe werden geladen…",
  },
  ja: {
    searchPlaceholder: "タイトル・製品・リコール番号で検索…",
    searchAriaLabel: "消費財リコールを検索",
    searchButton: "検索",
    searchSubmitAriaLabel: "検索を実行",
    searchFieldSrLabel: "CPSC 消費財リコールを検索",
    loadingSuggestions: "読み込み中…",
    suggestionsAriaLabel: "候補",
    loadingList: "読み込み中…",
  },
  pt: {
    searchPlaceholder: "Pesquisar por título, produto ou número…",
    searchAriaLabel: "Pesquisar recalls de consumo",
    searchButton: "Pesquisar",
    searchSubmitAriaLabel: "Enviar pesquisa",
    searchFieldSrLabel: "Pesquisar recalls CPSC",
    loadingSuggestions: "Carregando…",
    suggestionsAriaLabel: "Sugestões",
    loadingList: "Carregando recalls…",
  },
  hi: {
    searchPlaceholder: "शीर्षक, उत्पाद या नंबर से खोजें…",
    searchAriaLabel: "उपभोक्ता रिकॉल खोजें",
    searchButton: "खोजें",
    searchSubmitAriaLabel: "खोज सबमिट करें",
    searchFieldSrLabel: "CPSC उपभोक्ता रिकॉल खोजें",
    loadingSuggestions: "लोड हो रहा है…",
    suggestionsAriaLabel: "सुझाव",
    loadingList: "लोड हो रहा है…",
  },
  ru: {
    searchPlaceholder: "Поиск по названию, продукту или номеру…",
    searchAriaLabel: "Поиск отзывов товаров",
    searchButton: "Найти",
    searchSubmitAriaLabel: "Отправить поиск",
    searchFieldSrLabel: "Поиск отзывов CPSC",
    loadingSuggestions: "Загрузка…",
    suggestionsAriaLabel: "Подсказки",
    loadingList: "Загрузка…",
  },
  vi: {
    searchPlaceholder: "Tìm theo tiêu đề, sản phẩm hoặc số…",
    searchAriaLabel: "Tìm thu hồi hàng tiêu dùng",
    searchButton: "Tìm",
    searchSubmitAriaLabel: "Gửi tìm kiếm",
    searchFieldSrLabel: "Tìm thu hồi CPSC",
    loadingSuggestions: "Đang tải…",
    suggestionsAriaLabel: "Gợi ý",
    loadingList: "Đang tải…",
  },
};
