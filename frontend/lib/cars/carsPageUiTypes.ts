/** Client UI copy for /cars (hero, form, labels + results). */

/** Plain English order: year make model (subtitle under localized title). */
export function vehicleLineEn(y: string, m: string, mo: string) {
  return `${y} ${m} ${mo}`.replace(/\s+/g, " ").trim();
}

export type CarsPageUi = {
  /** Hero strip (CSS uppercases kicker) */
  heroKicker: string;
  heroTitle: string;
  heroSub: string;
  labelVin: string;
  placeholderVin: string;
  vinHint: string;
  dividerOr: string;
  labelYear: string;
  labelMake: string;
  labelModel: string;
  placeholderYear: string;
  placeholderMake: string;
  placeholderModel: string;
  searchButton: string;
  searchButtonSearching: string;
  errorNeedVinOrYmm: string;
  errorSearchFailed: string;
  /** Successful VIN lookup with zero open recalls */
  vinNoRecalls: (vin: string) => string;
  /** VPIC could not decode VIN or NHTSA returned no vehicle data */
  vinLookupNotFound: (vin: string) => string;
  emptyNoRecalls: string;
  badgeOpenCampaign: string;
  /** Teaser row on result cards (link to full vehicle recall page). */
  cardViewDetails: string;
  translating: string;
  campaignId: string;
  blockConsequence: string;
  blockSummary: string;
  blockRemedy: string;
  blockComponent: string;
  openRecallsFor: (year: string, make: string, model: string) => string;
  openRecallsForEn: (year: string, make: string, model: string) => string;
  metaNoCampaigns: string;
  metaNoCampaignsEn: string;
  metaCampaigns: (n: number) => string;
  metaCampaignsEn: (n: number) => string;
  pillReport: (reportDate: string) => string;
};
