/**
 * FDA recall page chrome (badge, nav link, source headings) — follows URL / picker language.
 */

export type RecallDetailChromeUi = {
  fdaBadge: string;
  allRecallsBack: string;
  officialSourcesHeading: string;
  viewFdaNotice: string;
};

const en: RecallDetailChromeUi = {
  fdaBadge: "FDA Safety Alert",
  allRecallsBack: "← All recalls",
  officialSourcesHeading: "Official sources",
  viewFdaNotice: "View FDA recall notice",
};

const es: RecallDetailChromeUi = {
  fdaBadge: "Alerta de seguridad FDA",
  allRecallsBack: "← Todos los retiros",
  officialSourcesHeading: "Fuentes oficiales",
  viewFdaNotice: "Ver aviso de retiro en FDA",
};

const de: RecallDetailChromeUi = {
  fdaBadge: "FDA-Sicherheitshinweis",
  allRecallsBack: "← Alle Rückrufe",
  officialSourcesHeading: "Offizielle Quellen",
  viewFdaNotice: "FDA-Rückrufmeldung ansehen",
};

const ja: RecallDetailChromeUi = {
  fdaBadge: "FDA 安全情報",
  allRecallsBack: "← リコール一覧",
  officialSourcesHeading: "公式情報源",
  viewFdaNotice: "FDAのリコール通知を見る",
};

const fr: RecallDetailChromeUi = {
  fdaBadge: "Alerte de sécurité FDA",
  allRecallsBack: "← Tous les rappels",
  officialSourcesHeading: "Sources officielles",
  viewFdaNotice: "Voir l’avis de rappel FDA",
};

const pt: RecallDetailChromeUi = {
  fdaBadge: "Alerta de segurança FDA",
  allRecallsBack: "← Todos os recalls",
  officialSourcesHeading: "Fontes oficiais",
  viewFdaNotice: "Ver aviso de recall da FDA",
};

const ru: RecallDetailChromeUi = {
  fdaBadge: "Предупреждение FDA",
  allRecallsBack: "← Все отзывы",
  officialSourcesHeading: "Официальные источники",
  viewFdaNotice: "Смотреть уведомление FDA об отзыве",
};

const it: RecallDetailChromeUi = {
  fdaBadge: "Avviso di sicurezza FDA",
  allRecallsBack: "← Tutti i richiami",
  officialSourcesHeading: "Fonti ufficiali",
  viewFdaNotice: "Vedi comunicato FDA sul richiamo",
};

const nl: RecallDetailChromeUi = {
  fdaBadge: "FDA-veiligheidswaarschuwing",
  allRecallsBack: "← Alle terugroepacties",
  officialSourcesHeading: "Officiële bronnen",
  viewFdaNotice: "FDA-terugroepbericht bekijken",
};

const pl: RecallDetailChromeUi = {
  fdaBadge: "Alert bezpieczeństwa FDA",
  allRecallsBack: "← Wszystkie wycofania",
  officialSourcesHeading: "Oficjalne źródła",
  viewFdaNotice: "Zobacz zawiadomienie FDA o wycofaniu",
};

const tr: RecallDetailChromeUi = {
  fdaBadge: "FDA güvenlik uyarısı",
  allRecallsBack: "← Tüm geri çağırmalar",
  officialSourcesHeading: "Resmi kaynaklar",
  viewFdaNotice: "FDA geri çağırma bildirimini görüntüle",
};

const fa: RecallDetailChromeUi = {
  fdaBadge: "هشدار ایمنی FDA",
  allRecallsBack: "← همه فراخوان‌ها",
  officialSourcesHeading: "منابع رسمی",
  viewFdaNotice: "مشاهده اطلاعیه فراخوان FDA",
};

const zh: RecallDetailChromeUi = {
  fdaBadge: "FDA 安全警报",
  allRecallsBack: "← 全部召回",
  officialSourcesHeading: "官方来源",
  viewFdaNotice: "查看 FDA 召回通知",
};

const vi: RecallDetailChromeUi = {
  fdaBadge: "Cảnh báo an toàn FDA",
  allRecallsBack: "← Tất cả thu hồi",
  officialSourcesHeading: "Nguồn chính thức",
  viewFdaNotice: "Xem thông báo thu hồi FDA",
};

const id: RecallDetailChromeUi = {
  fdaBadge: "Peringatan keselamatan FDA",
  allRecallsBack: "← Semua recall",
  officialSourcesHeading: "Sumber resmi",
  viewFdaNotice: "Lihat pemberitahuan recall FDA",
};

const cs: RecallDetailChromeUi = {
  fdaBadge: "Bezpečnostní upozornění FDA",
  allRecallsBack: "← Všechna stažení",
  officialSourcesHeading: "Oficiální zdroje",
  viewFdaNotice: "Zobrazit oznámení FDA o stažení",
};

const ko: RecallDetailChromeUi = {
  fdaBadge: "FDA 안전 경보",
  allRecallsBack: "← 전체 리콜",
  officialSourcesHeading: "공식 출처",
  viewFdaNotice: "FDA 리콜 공지 보기",
};

const uk: RecallDetailChromeUi = {
  fdaBadge: "Попередження FDA",
  allRecallsBack: "← Усі відкликання",
  officialSourcesHeading: "Офіційні джерела",
  viewFdaNotice: "Переглянути повідомлення FDA про відкликання",
};

const hu: RecallDetailChromeUi = {
  fdaBadge: "FDA biztonsági figyelmeztetés",
  allRecallsBack: "← Összes visszahívás",
  officialSourcesHeading: "Hivatalos források",
  viewFdaNotice: "FDA visszahívási közlemény megtekintése",
};

const hi: RecallDetailChromeUi = {
  fdaBadge: "FDA सुरक्षा अलर्ट",
  allRecallsBack: "← सभी रिकॉल",
  officialSourcesHeading: "आधिकारिक स्रोत",
  viewFdaNotice: "FDA रिकॉल नोटिस देखें",
};

const ar: RecallDetailChromeUi = {
  fdaBadge: "تنبيه أمان FDA",
  allRecallsBack: "← جميع الاستدعاءات",
  officialSourcesHeading: "المصادر الرسمية",
  viewFdaNotice: "عرض إشعار الاستدعاء من FDA",
};

const BY_CODE: Record<string, RecallDetailChromeUi> = {
  en,
  es,
  de,
  ja,
  fr,
  pt,
  ru,
  it,
  nl,
  pl,
  tr,
  fa,
  zh,
  vi,
  id,
  cs,
  ko,
  uk,
  hu,
  hi,
  ar,
};

export function getRecallDetailChromeUi(lang: string): RecallDetailChromeUi {
  const key = String(lang || "en").toLowerCase();
  return BY_CODE[key] ?? en;
}
