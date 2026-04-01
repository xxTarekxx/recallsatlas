import type { SiteUiLang } from "@/lib/siteLocale";

export type NavStrings = {
  fda: string;
  cars: string;
  about: string;
  language: string;
};

export const NAV_COPY: Record<SiteUiLang, NavStrings> = {
  en: {
    fda: "FDA Recalls",
    cars: "Cars",
    about: "About",
    language: "Language",
  },
  es: {
    fda: "Retiros FDA",
    cars: "Vehículos",
    about: "Acerca de",
    language: "Idioma",
  },
  ar: {
    fda: "استدعاءات FDA",
    cars: "المركبات",
    about: "حول",
    language: "اللغة",
  },
  zh: {
    fda: "FDA 召回",
    cars: "汽车",
    about: "关于",
    language: "语言",
  },
  fr: {
    fda: "Rappels FDA",
    cars: "Véhicules",
    about: "À propos",
    language: "Langue",
  },
  de: {
    fda: "FDA-Rückrufe",
    cars: "Fahrzeuge",
    about: "Über uns",
    language: "Sprache",
  },
  ja: {
    fda: "FDAリコール",
    cars: "車両",
    about: "概要",
    language: "言語",
  },
  pt: {
    fda: "Recall FDA",
    cars: "Veículos",
    about: "Sobre",
    language: "Idioma",
  },
  hi: {
    fda: "FDA रिकॉल",
    cars: "वाहन",
    about: "परिचय",
    language: "भाषा",
  },
  ru: {
    fda: "Отзывы FDA",
    cars: "Авто",
    about: "О сайте",
    language: "Язык",
  },
  vi: {
    fda: "Thu hồi FDA",
    cars: "Ô tô",
    about: "Giới thiệu",
    language: "Ngôn ngữ",
  },
};
