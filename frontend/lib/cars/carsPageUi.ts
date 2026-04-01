/** Client UI copy for /cars (labels + results head). */

export type CarsPageUi = {
  displayLanguage: string;
  translating: string;
  campaignId: string;
  blockConsequence: string;
  blockSummary: string;
  blockRemedy: string;
  openRecallsFor: (year: string, make: string, model: string) => string;
  openRecallsForEn: (year: string, make: string, model: string) => string;
  metaNoCampaigns: string;
  metaNoCampaignsEn: string;
  metaCampaigns: (n: number) => string;
  metaCampaignsEn: (n: number) => string;
  /** Date pill prefix + NHTSA report date string */
  pillReport: (reportDate: string) => string;
};

const en: CarsPageUi = {
  displayLanguage: "Display language",
  translating: "Translating…",
  campaignId: "Campaign",
  blockConsequence: "Consequence",
  blockSummary: "Summary",
  blockRemedy: "Remedy",
  openRecallsFor: (y, m, mo) => `${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `${y} ${m} ${mo}`,
  metaNoCampaigns: "No open campaigns",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Report ${d}`,
};

const es: CarsPageUi = {
  displayLanguage: "Idioma de visualización",
  translating: "Traduciendo…",
  campaignId: "Campaña",
  blockConsequence: "Consecuencia",
  blockSummary: "Resumen",
  blockRemedy: "Remedio",
  openRecallsFor: (y, m, mo) => `Retiros abiertos: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "Sin campañas abiertas",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) =>
    n === 1 ? "1 campaña" : `${n} campañas`,
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Informe ${d}`,
};

const ar: CarsPageUi = {
  displayLanguage: "لغة العرض",
  translating: "جارٍ الترجمة…",
  campaignId: "حملة",
  blockConsequence: "النتيجة",
  blockSummary: "ملخص",
  blockRemedy: "الإجراء التصحيحي",
  openRecallsFor: (y, m, mo) => `استدعاءات مفتوحة: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "لا توجد حملات مفتوحة",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "حملة واحدة" : `${n} حملات`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `تقرير ${d}`,
};

const zh: CarsPageUi = {
  displayLanguage: "显示语言",
  translating: "翻译中…",
  campaignId: "活动编号",
  blockConsequence: "后果",
  blockSummary: "摘要",
  blockRemedy: "补救措施",
  openRecallsFor: (y, m, mo) => `开放召回：${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "无开放活动",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 项活动" : `${n} 项活动`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `报告 ${d}`,
};

const fr: CarsPageUi = {
  displayLanguage: "Langue d’affichage",
  translating: "Traduction…",
  campaignId: "Campagne",
  blockConsequence: "Conséquence",
  blockSummary: "Résumé",
  blockRemedy: "Remède",
  openRecallsFor: (y, m, mo) => `Rappels ouverts : ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "Aucune campagne ouverte",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 campagne" : `${n} campagnes`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Rapport ${d}`,
};

const de: CarsPageUi = {
  displayLanguage: "Anzeigesprache",
  translating: "Wird übersetzt…",
  campaignId: "Kampagne",
  blockConsequence: "Folge",
  blockSummary: "Zusammenfassung",
  blockRemedy: "Abhilfe",
  openRecallsFor: (y, m, mo) => `Offene Rückrufe: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "Keine offenen Kampagnen",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 Kampagne" : `${n} Kampagnen`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `報告日 ${d}`,
};

const ja: CarsPageUi = {
  displayLanguage: "表示言語",
  translating: "翻訳中…",
  campaignId: "キャンペーン",
  blockConsequence: "影響",
  blockSummary: "概要",
  blockRemedy: "対策",
  openRecallsFor: (y, m, mo) => `対象リコール: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "対象キャンペーンなし",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1件のキャンペーン" : `${n}件のキャンペーン`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `報告 ${d}`,
};

const pt: CarsPageUi = {
  displayLanguage: "Idioma de exibição",
  translating: "Traduzindo…",
  campaignId: "Campanha",
  blockConsequence: "Consequência",
  blockSummary: "Resumo",
  blockRemedy: "Remediação",
  openRecallsFor: (y, m, mo) => `Recall aberto: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "Nenhuma campanha aberta",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 campanha" : `${n} campanhas`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Relatório ${d}`,
};

const hi: CarsPageUi = {
  displayLanguage: "प्रदर्शन भाषा",
  translating: "अनुवाद हो रहा है…",
  campaignId: "अभियान",
  blockConsequence: "परिणाम",
  blockSummary: "सारांश",
  blockRemedy: "उपचार",
  openRecallsFor: (y, m, mo) => `खुली रिकॉल: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "कोई खुला अभियान नहीं",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 अभियान" : `${n} अभियान`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `रिपोर्ट ${d}`,
};

const ru: CarsPageUi = {
  displayLanguage: "Язык интерфейса",
  translating: "Перевод…",
  campaignId: "Кампания",
  blockConsequence: "Последствия",
  blockSummary: "Кратко",
  blockRemedy: "Устранение",
  openRecallsFor: (y, m, mo) => `Открытые отзывы: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "Нет открытых кампаний",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} кампания`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
      return `${n} кампании`;
    return `${n} кампаний`;
  },
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Отчёт ${d}`,
};

const vi: CarsPageUi = {
  displayLanguage: "Ngôn ngữ hiển thị",
  translating: "Đang dịch…",
  campaignId: "Chiến dịch",
  blockConsequence: "Hậu quả",
  blockSummary: "Tóm tắt",
  blockRemedy: "Biện pháp khắc phục",
  openRecallsFor: (y, m, mo) => `Thu hồi đang mở: ${y} ${m} ${mo}`,
  openRecallsForEn: (y, m, mo) => `Open recalls: ${y} ${m} ${mo}`,
  metaNoCampaigns: "Không có chiến dịch nào",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 chiến dịch" : `${n} chiến dịch`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Báo cáo ${d}`,
};

const byLang: Record<string, CarsPageUi> = {
  en,
  es,
  ar,
  zh,
  fr,
  de,
  ja,
  pt,
  hi,
  ru,
  vi,
};

export function getCarsPageUi(lang: string): CarsPageUi {
  return byLang[lang] || en;
}
