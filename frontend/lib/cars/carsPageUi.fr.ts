import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiFr: CarsPageUi = {
  heroKicker: "Consultation sécurité NHTSA",
  heroTitle: "Rappels véhicules",
  heroSub:
    "Décodez un NIN (VIN) ou saisissez année, marque et modèle pour voir les campagnes ouvertes. Ouvrez une campagne pour la page complète ; changez de langue pour traduire à la demande.",
  labelVin: "NIV (VIN)",
  placeholderVin: "NIV à 17 caractères",
  vinHint:
    "Touchez le champ ou commencez à saisir pour choisir parmi les VIN déjà recherchés sur cet appareil.",
  dividerOr: "ou année / marque / modèle",
  labelYear: "Année",
  labelMake: "Marque",
  labelModel: "Modèle",
  placeholderYear: "ex. 2019",
  placeholderMake: "ex. Honda",
  placeholderModel: "ex. Civic",
  searchButton: "Rechercher les rappels",
  searchButtonSearching: "Recherche…",
  errorNeedVinOrYmm: "Saisissez le VIN, ou l’année, la marque et le modèle.",
  errorSearchFailed: "Échec de la recherche",
  vinNoRecalls: (vin) =>
    `Aucun rappel trouvé pour le NIV ${vin}.`,
  vinLookupNotFound: (vin) =>
    `Aucun rappel trouvé pour ce NIV ${vin}. Veuillez réessayer plus tard.`,
  emptyNoRecalls:
    "Aucun rappel actif signalé pour ce véhicule dans les données NHTSA.",
  badgeOpenCampaign: "Campagne ouverte · NHTSA",
  cardViewDetails: "Voir tous les détails",
  translating: "Traduction…",
  campaignId: "Campagne",
  blockConsequence: "Conséquence",
  blockSummary: "Résumé",
  blockRemedy: "Remède",
  blockComponent: "Composant",
  openRecallsFor: (y, m, mo) => `Année ${y} · Marque ${m} · Modèle ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "Aucune campagne ouverte",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 campagne" : `${n} campagnes`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Rapport ${d}`,
};
