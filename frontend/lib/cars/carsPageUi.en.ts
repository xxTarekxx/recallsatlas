import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiEn: CarsPageUi = {
  heroKicker: "NHTSA safety lookup",
  heroTitle: "Vehicle recalls",
  heroSub:
    "Decode a VIN or enter year, make, and model to see open campaigns. Open a campaign for the full page; switch language to translate on demand.",
  labelVin: "VIN",
  placeholderVin: "17-character VIN",
  vinHint:
    "Tap the field or start typing to pick from VINs you searched before on this device.",
  dividerOr: "or year / make / model",
  labelYear: "Year",
  labelMake: "Make",
  labelModel: "Model",
  placeholderYear: "e.g. 2019",
  placeholderMake: "e.g. Honda",
  placeholderModel: "e.g. Civic",
  searchButton: "Search recalls",
  searchButtonSearching: "Searching…",
  errorNeedVinOrYmm: "Enter VIN, or Year + Make + Model.",
  errorSearchFailed: "Search failed",
  vinNoRecalls: (vin) =>
    `We did not find any recalls for VIN ${vin}.`,
  vinLookupNotFound: (vin) =>
    `We did not find any recalls on this VIN ${vin}. Please try again later.`,
  emptyNoRecalls:
    "No active recalls reported for this vehicle in NHTSA data.",
  badgeOpenCampaign: "Open campaign · NHTSA",
  cardViewDetails: "View full details",
  translating: "Translating…",
  campaignId: "Campaign",
  blockConsequence: "Consequence",
  blockSummary: "Summary",
  blockRemedy: "Remedy",
  blockComponent: "Component",
  openRecallsFor: vehicleLineEn,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "No open campaigns",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Report ${d}`,
};
