import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiHi: CarsPageUi = {
  heroKicker: "NHTSA सुरक्षा लुकअप",
  heroTitle: "वाहन रिकॉल",
  heroSub:
    "VIN डिकोड करें या वर्ष, निर्माता और मॉडल दर्ज करें ताकि खुले अभियान देख सकें। पूरा पेज के लिए अभियान खोलें; मांग पर अनुवाद के लिए भाषा बदलें।",
  labelVin: "VIN",
  placeholderVin: "17-अक्षर का VIN",
  vinHint:
    "इस डिवाइस पर पहले खोजे गए VIN में से चुनने के लिए फ़ील्ड पर टैप करें या टाइप करना शुरू करें।",
  dividerOr: "या वर्ष / निर्माता / मॉडल",
  labelYear: "वर्ष",
  labelMake: "निर्माता",
  labelModel: "मॉडल",
  placeholderYear: "उदा. 2019",
  placeholderMake: "उदा. Honda",
  placeholderModel: "उदा. Civic",
  searchButton: "रिकॉल खोजें",
  searchButtonSearching: "खोज रहा है…",
  errorNeedVinOrYmm: "VIN दर्ज करें, या वर्ष + निर्माता + मॉडल।",
  errorSearchFailed: "खोज विफल",
  vinNoRecalls: (vin) =>
    `VIN ${vin} के लिए कोई रिकॉल नहीं मिला।`,
  vinLookupNotFound: (vin) =>
    `इस VIN ${vin} के लिए कोई रिकॉल नहीं मिला। बाद में पुनः प्रयास करें।`,
  emptyNoRecalls:
    "NHTSA डेटा में इस वाहन के लिए कोई सक्रिय रिकॉल रिपोर्ट नहीं।",
  badgeOpenCampaign: "खुला अभियान · NHTSA",
  cardViewDetails: "पूरा विवरण देखें",
  translating: "अनुवाद हो रहा है…",
  campaignId: "अभियान",
  blockConsequence: "परिणाम",
  blockSummary: "सारांश",
  blockRemedy: "उपचार",
  blockComponent: "घटक",
  openRecallsFor: (y, m, mo) => `वर्ष ${y} · निर्माता ${m} · मॉडल ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "कोई खुला अभियान नहीं",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 अभियान" : `${n} अभियान`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `रिपोर्ट ${d}`,
};
