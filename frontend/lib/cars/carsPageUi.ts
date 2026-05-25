import type { SiteUiLang } from "@/lib/siteLocale";
import type { CarsPageUi } from "./carsPageUiTypes";
import { carsPageUiEn } from "./carsPageUi.en";
import { carsPageUiEs } from "./carsPageUi.es";
import { carsPageUiAr } from "./carsPageUi.ar";
import { carsPageUiZh } from "./carsPageUi.zh";
import { carsPageUiFr } from "./carsPageUi.fr";
import { carsPageUiDe } from "./carsPageUi.de";
import { carsPageUiJa } from "./carsPageUi.ja";
import { carsPageUiPt } from "./carsPageUi.pt";
import { carsPageUiHi } from "./carsPageUi.hi";
import { carsPageUiRu } from "./carsPageUi.ru";
import { carsPageUiVi } from "./carsPageUi.vi";

export type { CarsPageUi } from "./carsPageUiTypes";

const byLang: Record<SiteUiLang, CarsPageUi> = {
  en: carsPageUiEn,
  es: carsPageUiEs,
  ar: carsPageUiAr,
  zh: carsPageUiZh,
  fr: carsPageUiFr,
  de: carsPageUiDe,
  ja: carsPageUiJa,
  pt: carsPageUiPt,
  hi: carsPageUiHi,
  ru: carsPageUiRu,
  vi: carsPageUiVi,
};

export function getCarsPageUi(lang: string): CarsPageUi {
  return byLang[lang as SiteUiLang] || byLang.en;
}
