import type { SiteUiLang } from "@/lib/siteLocale";

export type VehicleRecallPageUi = {
  back: string;
  eyebrow: string;
  fallbackEn: string;
};

export const VEHICLE_RECALL_PAGE_UI: Record<SiteUiLang, VehicleRecallPageUi> = {
  en: {
    back: "← Vehicle recall lookup",
    eyebrow: "NHTSA · Open safety campaign",
    fallbackEn: "This campaign is not available in your selected language yet — showing English.",
  },
  es: {
    back: "← Búsqueda de retiros de vehículos",
    eyebrow: "NHTSA · Campaña de seguridad abierta",
    fallbackEn:
      "Esta campaña aún no está disponible en el idioma seleccionado — se muestra en inglés.",
  },
  ar: {
    back: "← البحث عن استدعاءات المركبات",
    eyebrow: "NHTSA · حملة سلامة مفتوحة",
    fallbackEn: "هذه الحملة غير متوفرة باللغة المختارة بعد — يتم عرض النسخة الإنجليزية.",
  },
  zh: {
    back: "← 车辆召回查询",
    eyebrow: "NHTSA · 开放安全活动",
    fallbackEn: "该活动尚无可用的所选语言版本 — 显示英文。",
  },
  fr: {
    back: "← Recherche de rappels véhicules",
    eyebrow: "NHTSA · Campagne de sécurité ouverte",
    fallbackEn:
      "Cette campagne n’est pas encore disponible dans la langue choisie — version anglaise affichée.",
  },
  de: {
    back: "← Fahrzeugrückruf-Suche",
    eyebrow: "NHTSA · Offene Sicherheitskampagne",
    fallbackEn:
      "Diese Kampagne ist in der gewählten Sprache noch nicht verfügbar — englische Version.",
  },
  ja: {
    back: "← 車両リコール検索",
    eyebrow: "NHTSA · 公開中の安全キャンペーン",
    fallbackEn: "選択した言語では未対応です — 英語を表示しています。",
  },
  pt: {
    back: "← Busca de recalls de veículos",
    eyebrow: "NHTSA · Campanha de segurança aberta",
    fallbackEn:
      "Esta campanha ainda não está disponível no idioma selecionado — exibindo inglês.",
  },
  hi: {
    back: "← वाहन रिकॉल लुकअप",
    eyebrow: "NHTSA · खुला सुरक्षा अभियान",
    fallbackEn: "यह अभियान अभी चुनी भाषा में उपलब्ध नहीं — अंग्रेज़ी दिखाई जा रही है।",
  },
  ru: {
    back: "← Поиск отзывов транспорта",
    eyebrow: "NHTSA · Открытая кампания безопасности",
    fallbackEn:
      "Эта кампания пока недоступна на выбранном языке — показана английская версия.",
  },
  vi: {
    back: "← Tra cứu thu hồi xe",
    eyebrow: "NHTSA · Chiến dịch an toàn đang mở",
    fallbackEn:
      "Chiến dịch này chưa có bản dịch cho ngôn ngữ đã chọn — đang hiển thị tiếng Anh.",
  },
};
