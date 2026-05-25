import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiVi: CarsPageUi = {
  heroKicker: "Tra cứu an toàn NHTSA",
  heroTitle: "Thu hồi xe",
  heroSub:
    "Giải mã VIN hoặc nhập năm, hãng và dòng xe để xem các chiến dịch đang mở. Mở một chiến dịch để xem trang đầy đủ; đổi ngôn ngữ để dịch khi cần.",
  labelVin: "VIN",
  placeholderVin: "VIN 17 ký tự",
  vinHint:
    "Chạm vào ô hoặc bắt đầu gõ để chọn từ các VIN bạn đã tra cứu trên thiết bị này.",
  dividerOr: "hoặc năm / hãng / dòng xe",
  labelYear: "Năm",
  labelMake: "Hãng",
  labelModel: "Dòng xe",
  placeholderYear: "vd. 2019",
  placeholderMake: "vd. Honda",
  placeholderModel: "vd. Civic",
  searchButton: "Tìm thu hồi",
  searchButtonSearching: "Đang tìm…",
  errorNeedVinOrYmm: "Nhập VIN hoặc Năm + Hãng + Dòng xe.",
  errorSearchFailed: "Tìm kiếm thất bại",
  vinNoRecalls: (vin) =>
    `Không tìm thấy thu hồi nào cho VIN ${vin}.`,
  vinLookupNotFound: (vin) =>
    `Không tìm thấy thu hồi nào cho VIN ${vin} này. Vui lòng thử lại sau.`,
  emptyNoRecalls:
    "Không có thu hồi đang hiệu lực cho xe này trong dữ liệu NHTSA.",
  badgeOpenCampaign: "Chiến dịch đang mở · NHTSA",
  cardViewDetails: "Xem chi tiết đầy đủ",
  translating: "Đang dịch…",
  campaignId: "Chiến dịch",
  blockConsequence: "Hậu quả",
  blockSummary: "Tóm tắt",
  blockRemedy: "Biện pháp khắc phục",
  blockComponent: "Bộ phận",
  openRecallsFor: (y, m, mo) => `Năm ${y} · Hãng ${m} · Dòng xe ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "Không có chiến dịch nào",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 chiến dịch" : `${n} chiến dịch`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Báo cáo ${d}`,
};
