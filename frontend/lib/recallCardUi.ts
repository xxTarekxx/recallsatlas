import type { SiteUiLang } from "@/lib/siteLocale";

export type RecallCardUi = {
  terminated: string;
  ongoing: string;
  reported: string;
  unknownBrand: string;
  /** CPSC / consumer product list cards */
  consumerProduct: string;
};

export const RECALL_CARD_UI: Record<SiteUiLang, RecallCardUi> = {
  en: {
    terminated: "Terminated",
    ongoing: "Ongoing",
    reported: "Reported:",
    unknownBrand: "Unknown brand",
    consumerProduct: "Consumer product",
  },
  es: {
    terminated: "Terminado",
    ongoing: "En curso",
    reported: "Publicado:",
    unknownBrand: "Marca desconocida",
    consumerProduct: "Producto de consumo",
  },
  ar: {
    terminated: "منتهٍ",
    ongoing: "قيد التنفيذ",
    reported: "تاريخ الإبلاغ:",
    unknownBrand: "ماركة غير معروفة",
    consumerProduct: "منتج استهلاكي",
  },
  zh: {
    terminated: "已终止",
    ongoing: "进行中",
    reported: "报告日期：",
    unknownBrand: "未知品牌",
    consumerProduct: "消费品",
  },
  fr: {
    terminated: "Terminé",
    ongoing: "En cours",
    reported: "Signalé :",
    unknownBrand: "Marque inconnue",
    consumerProduct: "Produit de consommation",
  },
  de: {
    terminated: "Beendet",
    ongoing: "Laufend",
    reported: "Gemeldet:",
    unknownBrand: "Unbekannte Marke",
    consumerProduct: "Verbraucherprodukt",
  },
  ja: {
    terminated: "終了",
    ongoing: "継続中",
    reported: "報告日:",
    unknownBrand: "ブランド不明",
    consumerProduct: "消費財",
  },
  pt: {
    terminated: "Encerrado",
    ongoing: "Em andamento",
    reported: "Publicado:",
    unknownBrand: "Marca desconhecida",
    consumerProduct: "Produto de consumo",
  },
  hi: {
    terminated: "समाप्त",
    ongoing: "जारी",
    reported: "रिपोर्ट:",
    unknownBrand: "अज्ञात ब्रांड",
    consumerProduct: "उपभोक्ता उत्पाद",
  },
  ru: {
    terminated: "Завершён",
    ongoing: "Действует",
    reported: "Дата сообщения:",
    unknownBrand: "Неизвестный бренд",
    consumerProduct: "Товар широкого потребления",
  },
  vi: {
    terminated: "Đã kết thúc",
    ongoing: "Đang hiệu lực",
    reported: "Báo cáo:",
    unknownBrand: "Thương hiệu không xác định",
    consumerProduct: "Hàng tiêu dùng",
  },
};
