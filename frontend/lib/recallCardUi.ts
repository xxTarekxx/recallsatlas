import type { SiteUiLang } from "@/lib/siteLocale";

export type RecallCardUi = {
  terminated: string;
  ongoing: string;
  reported: string;
  unknownBrand: string;
};

export const RECALL_CARD_UI: Record<SiteUiLang, RecallCardUi> = {
  en: {
    terminated: "Terminated",
    ongoing: "Ongoing",
    reported: "Reported:",
    unknownBrand: "Unknown brand",
  },
  es: {
    terminated: "Terminado",
    ongoing: "En curso",
    reported: "Publicado:",
    unknownBrand: "Marca desconocida",
  },
  ar: {
    terminated: "منتهٍ",
    ongoing: "قيد التنفيذ",
    reported: "تاريخ الإبلاغ:",
    unknownBrand: "ماركة غير معروفة",
  },
  zh: {
    terminated: "已终止",
    ongoing: "进行中",
    reported: "报告日期：",
    unknownBrand: "未知品牌",
  },
  fr: {
    terminated: "Terminé",
    ongoing: "En cours",
    reported: "Signalé :",
  },
  de: {
    terminated: "Beendet",
    ongoing: "Laufend",
    reported: "Gemeldet:",
    unknownBrand: "Unbekannte Marke",
  },
  ja: {
    terminated: "終了",
    ongoing: "継続中",
    reported: "報告日:",
    unknownBrand: "ブランド不明",
  },
  pt: {
    terminated: "Encerrado",
    ongoing: "Em andamento",
    reported: "Publicado:",
  },
  hi: {
    terminated: "समाप्त",
    ongoing: "जारी",
    reported: "रिपोर्ट:",
    unknownBrand: "अज्ञात ब्रांड",
  },
  ru: {
    terminated: "Завершён",
    ongoing: "Действует",
    reported: "Дата сообщения:",
    unknownBrand: "Неизвестный бренд",
  },
  vi: {
    terminated: "Đã kết thúc",
    ongoing: "Đang hiệu lực",
    reported: "Báo cáo:",
    unknownBrand: "Thương hiệu không xác định",
  },
};
