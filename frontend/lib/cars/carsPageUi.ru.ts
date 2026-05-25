import { vehicleLineEn, type CarsPageUi } from "./carsPageUiTypes";

export const carsPageUiRu: CarsPageUi = {
  heroKicker: "Проверка безопасности NHTSA",
  heroTitle: "Отзывы транспортных средств",
  heroSub:
    "Расшифруйте VIN или введите год, марку и модель, чтобы увидеть открытые кампании. Откройте кампанию для полной страницы; смените язык для перевода по запросу.",
  labelVin: "VIN",
  placeholderVin: "17-значный VIN",
  vinHint:
    "Нажмите поле или начните ввод, чтобы выбрать из VIN, которые вы уже искали на этом устройстве.",
  dividerOr: "или год / марка / модель",
  labelYear: "Год",
  labelMake: "Марка",
  labelModel: "Модель",
  placeholderYear: "напр. 2019",
  placeholderMake: "напр. Honda",
  placeholderModel: "напр. Civic",
  searchButton: "Искать отзывы",
  searchButtonSearching: "Поиск…",
  errorNeedVinOrYmm: "Введите VIN или год, марку и модель.",
  errorSearchFailed: "Ошибка поиска",
  vinNoRecalls: (vin) =>
    `По VIN ${vin} отзывов не найдено.`,
  vinLookupNotFound: (vin) =>
    `По этому VIN ${vin} отзывов не найдено. Попробуйте позже.`,
  emptyNoRecalls:
    "В данных NHTSA нет активных отзывов для этого транспортного средства.",
  badgeOpenCampaign: "Открытая кампания · NHTSA",
  cardViewDetails: "Полные детали",
  translating: "Перевод…",
  campaignId: "Кампания",
  blockConsequence: "Последствия",
  blockSummary: "Кратко",
  blockRemedy: "Устранение",
  blockComponent: "Компонент",
  openRecallsFor: (y, m, mo) => `Год ${y} · Марка ${m} · Модель ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "Нет открытых кампаний",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} кампания`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
      return `${n} кампании`;
    return `${n} кампаний`;
  },
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `Отчёт ${d}`,
};
