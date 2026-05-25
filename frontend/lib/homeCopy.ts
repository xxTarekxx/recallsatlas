import type { SiteUiLang } from "@/lib/siteLocale";
import type { HomeCopy } from "./homeCopyTypes";
import { homeCopyEn } from "./homeCopy.en";
import { homeCopyEs } from "./homeCopy.es";
import { homeCopyAr } from "./homeCopy.ar";
import { homeCopyZh } from "./homeCopy.zh";
import { homeCopyFr } from "./homeCopy.fr";
import { homeCopyDe } from "./homeCopy.de";
import { homeCopyJa } from "./homeCopy.ja";
import { homeCopyPt } from "./homeCopy.pt";
import { homeCopyHi } from "./homeCopy.hi";
import { homeCopyRu } from "./homeCopy.ru";
import { homeCopyVi } from "./homeCopy.vi";

export type { HomeCopy } from "./homeCopyTypes";

export const HOME_COPY: Record<SiteUiLang, HomeCopy> = {
  en: homeCopyEn,
  es: homeCopyEs,
  ar: homeCopyAr,
  zh: homeCopyZh,
  fr: homeCopyFr,
  de: homeCopyDe,
  ja: homeCopyJa,
  pt: homeCopyPt,
  hi: homeCopyHi,
  ru: homeCopyRu,
  vi: homeCopyVi,
};
