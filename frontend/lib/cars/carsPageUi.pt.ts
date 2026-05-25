import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiPt: CarsPageUi = {
  heroKicker: "Consulta de segurança NHTSA",
  heroTitle: "Recalls de veículos",
  heroSub:
    "Decodifique um VIN ou informe ano, marca e modelo para ver campanhas abertas. Abra uma campanha para a página completa; altere o idioma para traduzir sob demanda.",
  labelVin: "VIN",
  placeholderVin: "VIN de 17 caracteres",
  vinHint:
    "Toque no campo ou comece a digitar para escolher entre os VINs que você já pesquisou neste dispositivo.",
  dividerOr: "ou ano / marca / modelo",
  labelYear: "Ano",
  labelMake: "Marca",
  labelModel: "Modelo",
  placeholderYear: "ex.: 2019",
  placeholderMake: "ex.: Honda",
  placeholderModel: "ex.: Civic",
  searchButton: "Buscar recalls",
  searchButtonSearching: "Buscando…",
  errorNeedVinOrYmm: "Informe o VIN ou ano, marca e modelo.",
  errorSearchFailed: "Falha na busca",
  vinNoRecalls: (vin) =>
    `Não encontramos recalls para o VIN ${vin}.`,
  vinLookupNotFound: (vin) =>
    `Não encontramos recalls para este VIN ${vin}. Tente novamente mais tarde.`,
  emptyNoRecalls:
    "Nenhum recall ativo registrado para este veículo nos dados da NHTSA.",
  badgeOpenCampaign: "Campanha aberta · NHTSA",
  cardViewDetails: "Ver detalhes completos",
  translating: "Traduzindo…",
  campaignId: "Campanha",
  blockConsequence: "Consequência",
  blockSummary: "Resumo",
  blockRemedy: "Remediação",
  blockComponent: "Componente",
  openRecallsFor: (y, m, mo) => `Ano ${y} · Marca ${m} · Modelo ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "Nenhuma campanha aberta",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 campanha" : `${n} campanhas`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Relatório ${d}`,
};
