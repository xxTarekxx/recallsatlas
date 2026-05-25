import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiEs: CarsPageUi = {
  heroKicker: "Consulta de seguridad NHTSA",
  heroTitle: "Retiros de vehículos",
  heroSub:
    "Descifre un VIN o ingrese año, marca y modelo para ver campañas abiertas. Abra una campaña para ver la página completa; cambie el idioma para traducir cuando lo necesite.",
  labelVin: "VIN",
  placeholderVin: "VIN de 17 caracteres",
  vinHint:
    "Toque el campo o empiece a escribir para elegir entre los VIN que ya buscó en este dispositivo.",
  dividerOr: "o año / marca / modelo",
  labelYear: "Año",
  labelMake: "Marca",
  labelModel: "Modelo",
  placeholderYear: "p. ej. 2019",
  placeholderMake: "p. ej. Honda",
  placeholderModel: "p. ej. Civic",
  searchButton: "Buscar retiros",
  searchButtonSearching: "Buscando…",
  errorNeedVinOrYmm: "Introduzca el VIN, o año, marca y modelo.",
  errorSearchFailed: "La búsqueda falló",
  vinNoRecalls: (vin) =>
    `No encontramos retiros para el VIN ${vin}.`,
  vinLookupNotFound: (vin) =>
    `No encontramos retiros para este VIN ${vin}. Vuelva a intentarlo más tarde.`,
  emptyNoRecalls:
    "No hay retiros activos para este vehículo en los datos de NHTSA.",
  badgeOpenCampaign: "Campaña abierta · NHTSA",
  cardViewDetails: "Ver detalles completos",
  translating: "Traduciendo…",
  campaignId: "Campaña",
  blockConsequence: "Consecuencia",
  blockSummary: "Resumen",
  blockRemedy: "Remedio",
  blockComponent: "Componente",
  openRecallsFor: (y, m, mo) => `Año ${y} · Marca ${m} · Modelo ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "Sin campañas abiertas",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 campaña" : `${n} campañas`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Informe ${d}`,
};
