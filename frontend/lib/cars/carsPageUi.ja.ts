import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiJa: CarsPageUi = {
  heroKicker: "NHTSA 安全照会",
  heroTitle: "車両リコール",
  heroSub:
    "VINを解読するか、年式・メーカー・車種を入力して公開中のキャンペーンを確認します。キャンペーンを開くと全ページを表示できます。言語を切り替えて必要に応じて翻訳します。",
  labelVin: "VIN",
  placeholderVin: "17桁のVIN",
  vinHint:
    "フィールドをタップするか入力を始め、本端末で以前検索したVINから選べます。",
  dividerOr: "または 年式 / メーカー / 車種",
  labelYear: "年式",
  labelMake: "メーカー",
  labelModel: "車種",
  placeholderYear: "例: 2019",
  placeholderMake: "例: Honda",
  placeholderModel: "例: Civic",
  searchButton: "リコールを検索",
  searchButtonSearching: "検索中…",
  errorNeedVinOrYmm: "VIN、または年式・メーカー・車種を入力してください。",
  errorSearchFailed: "検索に失敗しました",
  vinNoRecalls: (vin) =>
    `VIN ${vin} のリコールは見つかりませんでした。`,
  vinLookupNotFound: (vin) =>
    `この VIN ${vin} のリコールは見つかりませんでした。後でもう一度お試しください。`,
  emptyNoRecalls:
    "NHTSAデータに、この車両の有効なリコールはありません。",
  badgeOpenCampaign: "公開中のキャンペーン · NHTSA",
  cardViewDetails: "詳細を見る",
  translating: "翻訳中…",
  campaignId: "キャンペーン",
  blockConsequence: "影響",
  blockSummary: "概要",
  blockRemedy: "対策",
  blockComponent: "対象部品",
  openRecallsFor: (y, m, mo) => `年式 ${y} · メーカー ${m} · 車種 ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "対象キャンペーンなし",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1件のキャンペーン" : `${n}件のキャンペーン`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `報告 ${d}`,
};
