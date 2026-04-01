/** UI languages (matches cars / sitemap; English has no URL prefix). */
export const SITE_UI_LANGS = [
  "en",
  "es",
  "ar",
  "zh",
  "fr",
  "de",
  "ja",
  "pt",
  "hi",
  "ru",
  "vi",
] as const;

export type SiteUiLang = (typeof SITE_UI_LANGS)[number];

/** UI locales that use RTL layout (navbar, chrome). Brand wordmark stays LTR. */
const RTL_UI_LANGS = new Set<SiteUiLang>(["ar"]);

export function isRtlUiLang(lang: SiteUiLang): boolean {
  return RTL_UI_LANGS.has(lang);
}

/** Flag SVGs under `public/images/flags/` (navbar language picker). Hindi uses `hi.svg`. */
export const SITE_UI_LANG_FLAG_SRC: Record<SiteUiLang, string> = {
  en: "/images/flags/us.svg",
  es: "/images/flags/es.svg",
  ar: "/images/flags/sa.svg",
  zh: "/images/flags/cn.svg",
  fr: "/images/flags/fr.svg",
  de: "/images/flags/de.svg",
  ja: "/images/flags/jp.svg",
  pt: "/images/flags/br.svg",
  hi: "/images/flags/hi.svg",
  ru: "/images/flags/ru.svg",
  vi: "/images/flags/vn.svg",
};

/** English name — only for stable A–Z sort order in menus. */
const SITE_UI_LANG_SORT_EN: Record<SiteUiLang, string> = {
  en: "English",
  es: "Spanish",
  ar: "Arabic",
  zh: "Chinese",
  fr: "French",
  de: "German",
  ja: "Japanese",
  pt: "Portuguese",
  hi: "Hindi",
  ru: "Russian",
  vi: "Vietnamese",
};

/** Endonym (language name in that language) for pickers. */
export const SITE_UI_LANG_LABELS: Record<SiteUiLang, string> = {
  en: "English",
  es: "Español",
  ar: "العربية",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  pt: "Português",
  hi: "हिन्दी",
  ru: "Русский",
  vi: "Tiếng Việt",
};

/** Same codes as `SITE_UI_LANGS`, ordered A–Z by English sort key. */
export const SITE_UI_LANGS_ALPHABETICAL: SiteUiLang[] = [...SITE_UI_LANGS].sort((a, b) =>
  SITE_UI_LANG_SORT_EN[a].localeCompare(SITE_UI_LANG_SORT_EN[b], "en", {
    sensitivity: "base",
  })
);

const LANG_SET = new Set<string>(SITE_UI_LANGS);

export function isSiteUiLang(s: string): s is SiteUiLang {
  return LANG_SET.has(s);
}

/** English uses unprefixed URLs; other langs use `/${lang}/...`. */
export function parseLangFromPathname(pathname: string): SiteUiLang {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && isSiteUiLang(seg) && seg !== "en") return seg;
  return "en";
}

/** Strip `/${lang}` prefix from pathname; result always starts with `/`. */
export function stripLangPrefix(pathname: string, lang: SiteUiLang): string {
  if (lang === "en") return pathname || "/";
  if (pathname === `/${lang}`) return "/";
  if (pathname.startsWith(`/${lang}/`)) {
    const rest = pathname.slice(`/${lang}`.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname || "/";
}

/**
 * Prefix path with language segment when not English.
 * `path` is like `/recalls`, `/`, `/about`.
 */
export function withLangPath(path: string, lang: SiteUiLang): string {
  const p = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (lang === "en") return p;
  if (p === "/") return `/${lang}`;
  return `/${lang}${p}`;
}

/** Navigate from current pathname to equivalent path in `newLang`. */
export function pathForLang(pathname: string, newLang: SiteUiLang): string {
  const current = parseLangFromPathname(pathname);
  const rest = stripLangPrefix(pathname, current);
  return withLangPath(rest, newLang);
}
