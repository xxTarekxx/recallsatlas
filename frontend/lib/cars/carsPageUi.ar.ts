import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiAr: CarsPageUi = {
  heroKicker: "استعلام سلامة NHTSA",
  heroTitle: "استدعاءات المركبات",
  heroSub:
    "فك رموز رقم الشاصيس (VIN) أو أدخل السنة والصنع والطراز لعرض الحملات المفتوحة. افتح حملة للصفحة الكاملة؛ غيّر اللغة للترجمة عند الطلب.",
  labelVin: "VIN",
  placeholderVin: "VIN مكوّن من 17 خانة",
  vinHint:
    "اضغط الحقل أو ابدأ الكتابة للاختيار من أرقام VIN التي بحثت عنها سابقاً على هذا الجهاز.",
  dividerOr: "أو السنة / الصنع / الطراز",
  labelYear: "السنة",
  labelMake: "الصنع",
  labelModel: "الطراز",
  placeholderYear: "مثال: 2019",
  placeholderMake: "مثال: Honda",
  placeholderModel: "مثال: Civic",
  searchButton: "بحث عن الاستدعاءات",
  searchButtonSearching: "جارٍ البحث…",
  errorNeedVinOrYmm: "أدخل VIN، أو السنة والصنع والطراز.",
  errorSearchFailed: "فشل البحث",
  vinNoRecalls: (vin) =>
    `لم نعثر على استدعاءات لرقم VIN ‎${vin}.`,
  vinLookupNotFound: (vin) =>
    `لم نعثر على استدعاءات لهذا VIN ‎${vin}. يُرجى المحاولة لاحقًا.`,
  emptyNoRecalls: "لا توجد استدعاءات نشطة لهذه المركبة في بيانات NHTSA.",
  badgeOpenCampaign: "حملة مفتوحة · NHTSA",
  cardViewDetails: "عرض التفاصيل الكاملة",
  translating: "جارٍ الترجمة…",
  campaignId: "حملة",
  blockConsequence: "النتيجة",
  blockSummary: "ملخص",
  blockRemedy: "الإجراء التصحيحي",
  blockComponent: "المكوّن",
  openRecallsFor: (y, m, mo) => `السنة ${y} · الصنع ${m} · الطراز ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "لا توجد حملات مفتوحة",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "حملة واحدة" : `${n} حملات`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `تقرير ${d}`,
};
