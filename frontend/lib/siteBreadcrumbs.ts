import { NAV_COPY } from "@/lib/navCopy";
import {
  stripLangPrefix,
  withLangPath,
  type SiteUiLang,
} from "@/lib/siteLocale";

export type BreadcrumbItem = {
  href: string;
  label: string;
  current?: boolean;
};

export type BreadcrumbStrings = {
  home: string;
  fdaRecalls: string;
  vehicleRecalls: string;
  consumerRecalls: string;
  about: string;
  privacy: string;
  brands: string;
  years: string;
  categories: string;
  /** Fallback when slug is empty / odd */
  recallPage: string;
  campaignPrefix: string;
  vehicleDirectory: string;
  preview: string;
};

export const BREADCRUMB_UI: Record<SiteUiLang, BreadcrumbStrings> = {
  en: {
    home: "Home",
    ...pickNav("en"),
    privacy: "Privacy",
    brands: "Brands",
    years: "Years",
    categories: "Categories",
    recallPage: "Recall",
    campaignPrefix: "Campaign",
    vehicleDirectory: "Vehicle listings",
    preview: "Preview",
  },
  es: {
    home: "Inicio",
    ...pickNav("es"),
    privacy: "Privacidad",
    brands: "Marcas",
    years: "Años",
    categories: "Categorías",
    recallPage: "Retiro",
    campaignPrefix: "Campaña",
    vehicleDirectory: "Listado de vehículos",
    preview: "Vista previa",
  },
  ar: {
    home: "الرئيسية",
    ...pickNav("ar"),
    privacy: "الخصوصية",
    brands: "العلامات التجارية",
    years: "السنوات",
    categories: "الفئات",
    recallPage: "الاستدعاء",
    campaignPrefix: "حملة",
    vehicleDirectory: "قائمة المركبات",
    preview: "معاينة",
  },
  zh: {
    home: "首页",
    ...pickNav("zh"),
    privacy: "隐私",
    brands: "品牌",
    years: "年份",
    categories: "类别",
    recallPage: "召回",
    campaignPrefix: "活动",
    vehicleDirectory: "车辆列表",
    preview: "预览",
  },
  fr: {
    home: "Accueil",
    ...pickNav("fr"),
    privacy: "Confidentialité",
    brands: "Marques",
    years: "Années",
    categories: "Catégories",
    recallPage: "Rappel",
    campaignPrefix: "Campagne",
    vehicleDirectory: "Véhicules",
    preview: "Aperçu",
  },
  de: {
    home: "Start",
    ...pickNav("de"),
    privacy: "Datenschutz",
    brands: "Marken",
    years: "Jahre",
    categories: "Kategorien",
    recallPage: "Rückruf",
    campaignPrefix: "Aktion",
    vehicleDirectory: "Fahrzeugliste",
    preview: "Vorschau",
  },
  ja: {
    home: "ホーム",
    ...pickNav("ja"),
    privacy: "プライバシー",
    brands: "ブランド",
    years: "年",
    categories: "カテゴリ",
    recallPage: "リコール",
    campaignPrefix: "キャンペーン",
    vehicleDirectory: "車両一覧",
    preview: "プレビュー",
  },
  pt: {
    home: "Início",
    ...pickNav("pt"),
    privacy: "Privacidade",
    brands: "Marcas",
    years: "Anos",
    categories: "Categorias",
    recallPage: "Recall",
    campaignPrefix: "Campanha",
    vehicleDirectory: "Veículos",
    preview: "Pré-visualização",
  },
  hi: {
    home: "होम",
    ...pickNav("hi"),
    privacy: "गोपनीयता",
    brands: "ब्रांड",
    years: "वर्ष",
    categories: "श्रेणियाँ",
    recallPage: "रिकॉल",
    campaignPrefix: "अभियान",
    vehicleDirectory: "वाहन सूची",
    preview: "पूर्वावलोकन",
  },
  ru: {
    home: "Главная",
    ...pickNav("ru"),
    privacy: "Конфиденциальность",
    brands: "Бренды",
    years: "Годы",
    categories: "Категории",
    recallPage: "Отзыв",
    campaignPrefix: "Кампания",
    vehicleDirectory: "Авто",
    preview: "Предпросмотр",
  },
  vi: {
    home: "Trang chủ",
    ...pickNav("vi"),
    privacy: "Quyền riêng tư",
    brands: "Thương hiệu",
    years: "Năm",
    categories: "Danh mục",
    recallPage: "Thu hồi",
    campaignPrefix: "Chiến dịch",
    vehicleDirectory: "Danh sách xe",
    preview: "Xem trước",
  },
};

function pickNav(lang: SiteUiLang): Pick<
  BreadcrumbStrings,
  "fdaRecalls" | "vehicleRecalls" | "consumerRecalls" | "about"
> {
  const n = NAV_COPY[lang];
  return {
    fdaRecalls: n.fda,
    vehicleRecalls: n.cars,
    consumerRecalls: n.consumerRecalls,
    about: n.about,
  };
}

const MAX_CRUMB_LABEL = 52;

function humanizeSlugSegment(slug: string, fallback: string): string {
  const raw = decodeURIComponent(slug).trim();
  if (!raw) return fallback;
  const spaced = raw.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const titled = spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  if (titled.length <= MAX_CRUMB_LABEL) return titled;
  return `${titled.slice(0, MAX_CRUMB_LABEL - 1).trim()}…`;
}

function encodedPathFromParts(parts: string[]): string {
  return `/${parts.map((p) => encodeURIComponent(p)).join("/")}`;
}

/** Generic trail for uncommon routes: Home > Seg1 > Seg2 … */
function fallbackTrail(lang: SiteUiLang, parts: string[], s: BreadcrumbStrings): BreadcrumbItem[] {
  const home: BreadcrumbItem = {
    href: withLangPath("/", lang),
    label: s.home,
  };
  const out: BreadcrumbItem[] = [home];
  for (let i = 0; i < parts.length; i++) {
    const slice = parts.slice(0, i + 1);
    const href = withLangPath(encodedPathFromParts(slice), lang);
    const label = humanizeSlugSegment(parts[i], parts[i]);
    out.push({
      href,
      label,
      current: i === parts.length - 1,
    });
  }
  return out;
}

/**
 * Build accessible breadcrumb items from pathname (include `/${lang}` prefix when present).
 */
export function buildBreadcrumbTrail(
  pathname: string,
  lang: SiteUiLang,
  s: BreadcrumbStrings
): BreadcrumbItem[] {
  const rest = stripLangPrefix(pathname, lang).replace(/\/+$/, "") || "/";
  const parts = rest.split("/").filter(Boolean);
  if (parts.length === 0) return [];

  const home: BreadcrumbItem = { href: withLangPath("/", lang), label: s.home };
  const fdaList = withLangPath("/recalls", lang);

  if (parts[0] === "about" && parts.length === 1) {
    return [
      home,
      { href: withLangPath("/about", lang), label: s.about, current: true },
    ];
  }
  if (parts[0] === "privacy" && parts.length === 1) {
    return [
      home,
      { href: withLangPath("/privacy", lang), label: s.privacy, current: true },
    ];
  }
  if (parts[0] === "cars" && parts.length === 1) {
    return [
      home,
      {
        href: withLangPath("/cars", lang),
        label: s.vehicleRecalls,
        current: true,
      },
    ];
  }

  if (parts[0] === "brand") {
    if (parts.length === 1) {
      return [
        home,
        { href: withLangPath("/brand", lang), label: s.brands, current: true },
      ];
    }
    const slug = parts[1];
    return [
      home,
      { href: withLangPath("/brand", lang), label: s.brands },
      {
        href: withLangPath(encodedPathFromParts(parts.slice(0, 2)), lang),
        label: humanizeSlugSegment(slug, s.brands),
        current: true,
      },
    ];
  }

  if (parts[0] === "year") {
    if (parts.length === 1) {
      return [
        home,
        { href: withLangPath("/year", lang), label: s.years, current: true },
      ];
    }
    const y = decodeURIComponent(parts[1]);
    return [
      home,
      { href: withLangPath("/year", lang), label: s.years },
      {
        href: withLangPath(encodedPathFromParts(parts.slice(0, 2)), lang),
        label: y,
        current: true,
      },
    ];
  }

  if (parts[0] === "category" && parts[1]) {
    const cat = parts[1];
    return [
      home,
      { href: fdaList, label: s.fdaRecalls },
      {
        href: withLangPath(encodedPathFromParts(parts.slice(0, 2)), lang),
        label: humanizeSlugSegment(cat, s.categories),
        current: true,
      },
    ];
  }

  if (parts[0] === "general-recalls") {
    const listHref = withLangPath("/general-recalls", lang);
    if (parts.length === 1) {
      return [
        home,
        { href: listHref, label: s.consumerRecalls, current: true },
      ];
    }
    const slug = parts[1];
    return [
      home,
      { href: listHref, label: s.consumerRecalls },
      {
        href: withLangPath(`/general-recalls/${encodeURIComponent(slug)}`, lang),
        label: humanizeSlugSegment(slug, s.recallPage),
        current: true,
      },
    ];
  }

  if (parts[0] === "recalls") {
    if (parts.length === 1) {
      return [home, { href: fdaList, label: s.fdaRecalls, current: true }];
    }

    if (parts[1] === "vehicle" && parts[2]) {
      const campaign = decodeURIComponent(parts[2]);
      return [
        home,
        { href: withLangPath("/cars", lang), label: s.vehicleRecalls },
        {
          href: withLangPath(
            `/recalls/vehicle/${encodeURIComponent(campaign)}`,
            lang
          ),
          label: `${s.campaignPrefix} ${campaign}`,
          current: true,
        },
      ];
    }

    if (parts[1] === "vehicles") {
      return [
        home,
        { href: fdaList, label: s.fdaRecalls },
        {
          href: withLangPath("/recalls/vehicles", lang),
          label: s.vehicleDirectory,
          current: true,
        },
      ];
    }

    if (parts[1] === "preview" && parts[2]) {
      return [
        home,
        { href: fdaList, label: s.fdaRecalls },
        {
          href: withLangPath(
            encodedPathFromParts(parts.slice(0, 3)),
            lang
          ),
          label: s.preview,
          current: true,
        },
      ];
    }

    if (parts.length === 2) {
      const slug = parts[1];
      return [
        home,
        { href: fdaList, label: s.fdaRecalls },
        {
          href: withLangPath(`/recalls/${encodeURIComponent(slug)}`, lang),
          label: humanizeSlugSegment(slug, s.recallPage),
          current: true,
        },
      ];
    }
  }

  return fallbackTrail(lang, parts, s);
}
