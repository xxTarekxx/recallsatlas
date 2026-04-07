import type { SiteUiLang } from "@/lib/siteLocale";

export type NavStrings = {
  fda: string;
  cars: string;
  consumerRecalls: string;
  about: string;
  language: string;
};

export const NAV_COPY: Record<SiteUiLang, NavStrings> = {
  en: {
    fda: "FDA Recalls",
    cars: "Vehicle Recalls",
    consumerRecalls: "Consumer Recalls",
    about: "About",
    language: "Language",
  },
  es: {
    fda: "Retiros FDA",
    cars: "Vehículos",
    consumerRecalls: "Productos de consumo",
    about: "Acerca de",
    language: "Idioma",
  },
  ar: {
    fda: "استدعاءات FDA",
    cars: "المركبات",
    consumerRecalls: "منتجات استهلاكية",
    about: "حول",
    language: "اللغة",
  },
  zh: {
    fda: "FDA 召回",
    cars: "汽车",
    consumerRecalls: "消费品召回",
    about: "关于",
    language: "语言",
  },
  fr: {
    fda: "Rappels FDA",
    cars: "Véhicules",
    consumerRecalls: "Rappels consommation",
    about: "À propos",
    language: "Langue",
  },
  de: {
    fda: "FDA-Rückrufe",
    cars: "Fahrzeuge",
    consumerRecalls: "Verbraucher-Rückrufe",
    about: "Über uns",
    language: "Sprache",
  },
  ja: {
    fda: "FDAリコール",
    cars: "車両",
    consumerRecalls: "消費財リコール",
    about: "概要",
    language: "言語",
  },
  pt: {
    fda: "Recall FDA",
    cars: "Veículos",
    consumerRecalls: "Consumidor",
    about: "Sobre",
    language: "Idioma",
  },
  hi: {
    fda: "FDA रिकॉल",
    cars: "वाहन",
    consumerRecalls: "उपभोक्ता रिकॉल",
    about: "परिचय",
    language: "भाषा",
  },
  ru: {
    fda: "Отзывы FDA",
    cars: "Авто",
    consumerRecalls: "Товары",
    about: "О сайте",
    language: "Язык",
  },
  vi: {
    fda: "Thu hồi FDA",
    cars: "Ô tô",
    consumerRecalls: "Tiêu dùng",
    about: "Giới thiệu",
    language: "Ngôn ngữ",
  },
};
