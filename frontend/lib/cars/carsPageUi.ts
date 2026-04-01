/** Client UI copy for /cars (hero, form, labels + results). */

import type { SiteUiLang } from "@/lib/siteLocale";

/** Plain English order: year make model (subtitle under localized title). */
function vehicleLineEn(y: string, m: string, mo: string) {
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

const en: CarsPageUi = {
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

const es: CarsPageUi = {
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

const ar: CarsPageUi = {
  heroKicker: "استعلام سلامة NHTSA",
  heroTitle: "استدعاءات المركبات",
  heroSub:
    "فك رموز رقم الشاصيس (VIN) أو أدخل السنة والصنع والطراز لعرض الحملات المفتوحة. افتح حملة للصفحة الكاملة؛ غيّر اللغة للترجمة عند الطلب.",
  labelVin: "VIN",
  placeholderVin: "VIN مكوّن من 17 خانة",
  vinHint:
    "اضغط الحقل أو ابدأ الكتابة للاختيار من أرقام VIN التي بحثت عنها سابقاً على هذا الجهاز.",
  dividerOr: "أو السنة / الصنع / الطراز",
  labelYear: "السنة",
  labelMake: "الصنع",
  labelModel: "الطراز",
  placeholderYear: "مثال: 2019",
  placeholderMake: "مثال: Honda",
  placeholderModel: "مثال: Civic",
  searchButton: "بحث عن الاستدعاءات",
  searchButtonSearching: "جارٍ البحث…",
  errorNeedVinOrYmm: "أدخل VIN، أو السنة والصنع والطراز.",
  errorSearchFailed: "فشل البحث",
  vinNoRecalls: (vin) =>
    `لم نعثر على استدعاءات لرقم VIN ‎${vin}.`,
  emptyNoRecalls: "لا توجد استدعاءات نشطة لهذه المركبة في بيانات NHTSA.",
  badgeOpenCampaign: "حملة مفتوحة · NHTSA",
  cardViewDetails: "عرض التفاصيل الكاملة",
  translating: "جارٍ الترجمة…",
  campaignId: "حملة",
  blockConsequence: "النتيجة",
  blockSummary: "ملخص",
  blockRemedy: "الإجراء التصحيحي",
  blockComponent: "المكوّن",
  openRecallsFor: (y, m, mo) => `السنة ${y} · الصنع ${m} · الطراز ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "لا توجد حملات مفتوحة",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "حملة واحدة" : `${n} حملات`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `تقرير ${d}`,
};

const zh: CarsPageUi = {
  heroKicker: "NHTSA 安全查询",
  heroTitle: "车辆召回",
  heroSub:
    "解码 VIN 或输入年款、品牌、车型以查看开放活动。打开活动可查看完整页面；切换语言即可按需翻译。",
  labelVin: "VIN",
  placeholderVin: "17 位 VIN",
  vinHint: "点击输入框或开始输入，从本设备上曾搜索过的 VIN 中选择。",
  dividerOr: "或 年款 / 品牌 / 车型",
  labelYear: "年款",
  labelMake: "品牌",
  labelModel: "车型",
  placeholderYear: "例如 2019",
  placeholderMake: "例如 Honda",
  placeholderModel: "例如 Civic",
  searchButton: "搜索召回",
  searchButtonSearching: "搜索中…",
  errorNeedVinOrYmm: "请输入 VIN，或年款、品牌与车型。",
  errorSearchFailed: "搜索失败",
  vinNoRecalls: (vin) => `未找到 VIN ${vin} 的相关召回。`,
  emptyNoRecalls: "NHTSA 数据中未报告此车辆有活跃召回。",
  badgeOpenCampaign: "开放活动 · NHTSA",
  cardViewDetails: "查看完整详情",
  translating: "翻译中…",
  campaignId: "活动编号",
  blockConsequence: "后果",
  blockSummary: "摘要",
  blockRemedy: "补救措施",
  blockComponent: "部件",
  openRecallsFor: (y, m, mo) => `年份 ${y} · 品牌 ${m} · 车型 ${mo}`,
  openRecallsForEn: vehicleLineEn,
  metaNoCampaigns: "无开放活动",
  metaNoCampaignsEn: "No open campaigns",
  metaCampaigns: (n) => (n === 1 ? "1 项活动" : `${n} 项活动`),
  metaCampaignsEn: (n) => `${n} campaign${n === 1 ? "" : "s"}`,
  pillReport: (d) => `报告 ${d}`,
};

const fr: CarsPageUi = {
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

const de: CarsPageUi = {
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

const ja: CarsPageUi = {
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

const pt: CarsPageUi = {
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

const hi: CarsPageUi = {
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

const ru: CarsPageUi = {
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

const vi: CarsPageUi = {
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

const byLang: Record<SiteUiLang, CarsPageUi> = {
  en,
  es,
  ar,
  zh,
  fr,
  de,
  ja,
  pt,
  hi,
  ru,
  vi,
};

export function getCarsPageUi(lang: string): CarsPageUi {
  return byLang[lang as SiteUiLang] || en;
}
