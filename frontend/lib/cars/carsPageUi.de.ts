import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiDe: CarsPageUi = {
  heroKicker: "NHTSA-Sicherheitsabfrage",
  heroTitle: "Fahrzeugrückrufe",
  heroSub:
    "VIN decodieren oder Jahr, Marke und Modell eingeben, um offene Kampagnen zu sehen. Kampagne öffnen für die vollständige Seite; Sprache wechseln für Übersetzung bei Bedarf.",
  labelVin: "FIN (VIN)",
  placeholderVin: "17-stellige VIN",
  vinHint:
    "Feld antippen oder tippen, um aus zuvor auf diesem Gerät gesuchten VINs zu wählen.",
  dividerOr: "oder Jahr / Marke / Modell",
  labelYear: "Jahr",
  labelMake: "Marke",
  labelModel: "Modell",
  placeholderYear: "z. B. 2019",
  placeholderMake: "z. B. Honda",
  placeholderModel: "z. B. Civic",
  searchButton: "Rückrufe suchen",
  searchButtonSearching: "Suche…",
  errorNeedVinOrYmm: "VIN oder Jahr, Marke und Modell eingeben.",
  errorSearchFailed: "Suche fehlgeschlagen",
  vinNoRecalls: (vin) =>
    `Für die VIN ${vin} wurden keine Rückrufe gefunden.`,
  vinLookupNotFound: (vin) =>
    `Für diese VIN ${vin} wurden keine Rückrufe gefunden. Bitte später erneut versuchen.`,
  emptyNoRecalls:
    "Für dieses Fahrzeug sind in den NHTSA-Daten keine aktiven Rückrufe gemeldet.",
  badgeOpenCampaign: "Offene Kampagne · NHTSA",
  cardViewDetails: "Alle Details anzeigen",
  translating: "Wird übersetzt…",
  campaignId: "Kampagne",
  blockConsequence: "Folge",
  blockSummary: "Zusammenfassung",
  blockRemedy: "Abhilfe",
  blockComponent: "Bauteil",
  openRecallsFor: (y, m, mo) => `Jahr ${y} · Marke ${m} · Modell ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "Keine offenen Kampagnen",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 Kampagne" : `${n} Kampagnen`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Bericht ${d}`,
};
