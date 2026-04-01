import type { SiteUiLang } from "@/lib/siteLocale";

export type HomeCopy = {
  badge: string;
  badgeNhtsa: string;
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  heroQuickFda: string;
  heroQuickVehicle: string;
  searchPlaceholder: string;
  statRecalls: string;
  statSource: string;
  statLangs: string;
  statFree: string;
  sectionBrowse: string;
  sectionChoose: string;
  fdaTitle: string;
  fdaBody: string;
  fdaCta: string;
  vehicleTitle: string;
  vehicleBody: string;
  vehicleCta: string;
  aboutKicker: string;
  aboutTitle: string;
  aboutP1: string;
  aboutP2: string;
  aboutP3Start: string;
  aboutP3Strong: string;
  aboutP3End: string;
  aboutLink: string;
};

export const HOME_COPY: Record<SiteUiLang, HomeCopy> = {
  en: {
    badge: "Updated daily from FDA.gov",
    badgeNhtsa: "NHTSA vehicle safety data",
    heroLine1: "U.S. Recall Data,",
    heroLine2: "Clear & Searchable",
    heroSub:
      "Search FDA food, drug, medical device, and supplement recalls below—plain-language summaries with links to official notices. For cars and trucks, use Vehicle recalls to look up open campaigns by VIN or year, make, and model (NHTSA).",
    heroQuickFda: "Browse FDA recalls",
    heroQuickVehicle: "Check vehicle recalls",
    searchPlaceholder: "Search by headline or product type...",
    statRecalls: "Recalls Tracked",
    statSource: "Official Source",
    statLangs: "Languages",
    statFree: "Always",
    sectionBrowse: "Browse by source",
    sectionChoose: "Choose a recall category",
    fdaTitle: "FDA Recalls",
    fdaBody:
      "Drugs, food products, medical devices, dietary supplements, cosmetics, and biologics recalled by the U.S. Food & Drug Administration.",
    fdaCta: "Browse FDA recalls →",
    vehicleTitle: "Vehicle Recalls",
    vehicleBody: "Check recalls using VIN or vehicle details",
    vehicleCta: "Check Now",
    aboutKicker: "About this site",
    aboutTitle: "About Recalls Atlas",
    aboutP1:
      "Recalls Atlas brings together public recall information from the U.S. Food and Drug Administration (FDA) and the National Highway Traffic Safety Administration (NHTSA). Whether you are checking a medication, food product, medical device, or a car or truck, you can start here and follow through to the official government notice for full details.",
    aboutP2:
      "Summaries on this site are for quick orientation. Always confirm lot numbers, dates, and instructions on the FDA or NHTSA source linked directly from each recall page. We are committed to improving accessibility (WCAG-minded patterns, keyboard navigation, and readable contrast) and expanding support to more than 11 languages so recall information reaches more people worldwide.",
    aboutP3Start: "Recalls Atlas is an ",
    aboutP3Strong: "independent aggregator",
    aboutP3End:
      " and is not affiliated with or endorsed by the FDA or NHTSA. Data is compiled from public feeds and pages for informational purposes only. ",
    aboutLink: "Learn more →",
  },
  es: {
    badge: "Actualizado a diario desde FDA.gov",
    badgeNhtsa: "Datos de seguridad vehicular NHTSA",
    heroLine1: "Datos de retiros en EE. UU.,",
    heroLine2: "Claros y buscables",
    heroSub:
      "Busque retiros de alimentos, medicamentos, dispositivos y suplementos de la FDA con resúmenes claros y enlaces oficiales. Para vehículos, use Retiros de vehículos para consultar por VIN o año/marca/modelo (NHTSA).",
    heroQuickFda: "Ver retiros FDA",
    heroQuickVehicle: "Consultar vehículos",
    searchPlaceholder: "Buscar por titular o tipo de producto...",
    statRecalls: "Retiros seguidos",
    statSource: "Fuente oficial",
    statLangs: "Idiomas",
    statFree: "Gratis",
    sectionBrowse: "Explorar por fuente",
    sectionChoose: "Elija una categoría",
    fdaTitle: "Retiros FDA",
    fdaBody:
      "Medicamentos, alimentos, dispositivos médicos, suplementos, cosméticos y biológicos retirados por la FDA.",
    fdaCta: "Ver retiros FDA →",
    vehicleTitle: "Retiros de vehículos",
    vehicleBody: "Consulte por VIN o datos del vehículo",
    vehicleCta: "Consultar",
    aboutKicker: "Sobre este sitio",
    aboutTitle: "Acerca de Recalls Atlas",
    aboutP1:
      "Recalls Atlas reúne información pública de retiros de la FDA y la NHTSA. Puede empezar aquí y seguir hasta el aviso gubernamental oficial.",
    aboutP2:
      "Los resúmenes son orientativos. Confirme lotes, fechas e instrucciones en la fuente oficial enlazada en cada página.",
    aboutP3Start: "Recalls Atlas es un ",
    aboutP3Strong: "agregador independiente",
    aboutP3End:
      " y no está afiliado ni respaldado por la FDA o la NHTSA. Los datos son solo informativos. ",
    aboutLink: "Más información →",
  },
  ar: {
    badge: "يُحدَّث يوميًا من FDA.gov",
    badgeNhtsa: "بيانات سلامة المركبات NHTSA",
    heroLine1: "بيانات الاستدعاءات الأمريكية،",
    heroLine2: "واضحة وقابلة للبحث",
    heroSub:
      "ابحث أدناه عن استدعاءات FDA للأغذية والأدوية والأجهزة والمكملات مع ملخصات وروابط رسمية. للمركبات، افتح استدعاءات المركبات للتحقق برقم الشاصي أو السنة/الصنع/الطراز (NHTSA).",
    heroQuickFda: "استدعاءات FDA",
    heroQuickVehicle: "استدعاءات المركبات",
    searchPlaceholder: "ابحث بالعنوان أو نوع المنتج...",
    statRecalls: "استدعاءات متتبّعة",
    statSource: "مصدر رسمي",
    statLangs: "لغات",
    statFree: "مجانًا",
    sectionBrowse: "تصفح حسب المصدر",
    sectionChoose: "اختر فئة",
    fdaTitle: "استدعاءات FDA",
    fdaBody:
      "أدوية وأغذية وأجهزة طبية ومكملات ومستحضرات تجميل ومنتجات بيولوجية مستدعاة من FDA.",
    fdaCta: "تصفح استدعاءات FDA ←",
    vehicleTitle: "استدعاءات المركبات",
    vehicleBody: "تحقق برقم الشاصي أو بيانات المركبة",
    vehicleCta: "تحقق الآن",
    aboutKicker: "عن الموقع",
    aboutTitle: "About Recalls Atlas",
    aboutP1:
      "يجمع Recalls Atlas معلومات الاستدعاءات العامة من FDA وNHTSA. يمكنك البدء هنا والانتقال إلى الإشعار الحكومي الرسمي.",
    aboutP2:
      "الملخصات للتوجيه السريع. تأكد دائمًا من الأرقام والتواريخ والتعليمات من المصدر الرسمي المرتبط بكل صفحة.",
    aboutP3Start: "Recalls Atlas ",
    aboutP3Strong: "مجمّع مستقل",
    aboutP3End: " وليس تابعًا لـ FDA أو NHTSA. البيانات للمعلومات فقط. ",
    aboutLink: "المزيد ←",
  },
  zh: {
    badge: "每日更新（FDA.gov）",
    badgeNhtsa: "NHTSA 车辆安全数据",
    heroLine1: "美国召回数据，",
    heroLine2: "清晰可搜索",
    heroSub:
      "在下方搜索 FDA 食品、药品、器械与补充剂召回，附简明摘要与官方链接。车辆请前往「车辆召回」，按 VIN 或年款/品牌/车型查询（NHTSA）。",
    heroQuickFda: "浏览 FDA 召回",
    heroQuickVehicle: "车辆召回查询",
    searchPlaceholder: "按标题或产品类型搜索…",
    statRecalls: "已收录召回",
    statSource: "官方来源",
    statLangs: "语言",
    statFree: "免费",
    sectionBrowse: "按来源浏览",
    sectionChoose: "选择类别",
    fdaTitle: "FDA 召回",
    fdaBody: "药品、食品、医疗器械、膳食补充剂、化妆品及生物制品等 FDA 召回信息。",
    fdaCta: "浏览 FDA 召回 →",
    vehicleTitle: "车辆召回",
    vehicleBody: "使用 VIN 或车辆信息查询",
    vehicleCta: "立即查询",
    aboutKicker: "关于本站",
    aboutTitle: "关于 Recalls Atlas",
    aboutP1:
      "Recalls Atlas 汇总 FDA 与 NHTSA 的公开召回信息。您可在此开始并跳转到官方完整公告。",
    aboutP2: "摘要仅供快速了解。请务必在链接的 FDA/NHTSA 来源核实批号、日期与说明。",
    aboutP3Start: "Recalls Atlas 为",
    aboutP3Strong: "独立聚合网站",
    aboutP3End: "，不隶属于 FDA 或 NHTSA。数据仅供参考。",
    aboutLink: "了解更多 →",
  },
  fr: {
    badge: "Mis à jour quotidiennement depuis FDA.gov",
    badgeNhtsa: "Données sécurité véhicules NHTSA",
    heroLine1: "Données de rappels américains,",
    heroLine2: "Claires et consultables",
    heroSub:
      "Recherchez ci-dessous les rappels FDA (aliments, médicaments, dispositifs, compléments) avec résumés et liens officiels. Pour les véhicules, ouvrez Rappels véhicules pour une recherche par VIN ou année/marque/modèle (NHTSA).",
    heroQuickFda: "Rappels FDA",
    heroQuickVehicle: "Rappels véhicules",
    searchPlaceholder: "Rechercher par titre ou type de produit...",
    statRecalls: "Rappels suivis",
    statSource: "Source officielle",
    statLangs: "Langues",
    statFree: "Gratuit",
    sectionBrowse: "Parcourir par source",
    sectionChoose: "Choisir une catégorie",
    fdaTitle: "Rappels FDA",
    fdaBody:
      "Médicaments, aliments, dispositifs médicaux, compléments, cosmétiques et biologiques rappelés par la FDA.",
    fdaCta: "Voir les rappels FDA →",
    vehicleTitle: "Rappels véhicules",
    vehicleBody: "Vérifiez par VIN ou détails du véhicule",
    vehicleCta: "Vérifier",
    aboutKicker: "À propos",
    aboutTitle: "À propos de Recalls Atlas",
    aboutP1:
      "Recalls Atlas regroupe les informations publiques de rappels de la FDA et de la NHTSA. Commencez ici et suivez le lien vers l’avis officiel.",
    aboutP2:
      "Les résumés sont indicatifs. Vérifiez toujours lots, dates et instructions sur la source officielle liquée.",
    aboutP3Start: "Recalls Atlas est un ",
    aboutP3Strong: "agrégateur indépendant",
    aboutP3End:
      " et n’est pas affilié à la FDA ou à la NHTSA. Données à titre informatif. ",
    aboutLink: "En savoir plus →",
  },
  de: {
    badge: "Täglich aktualisiert von FDA.gov",
    badgeNhtsa: "NHTSA-Fahrzeugsicherheitsdaten",
    heroLine1: "US-Rückrufdaten,",
    heroLine2: "Klar & durchsuchbar",
    heroSub:
      "Suchen Sie unten FDA-Rückrufe zu Lebensmitteln, Arzneimitteln, Medizinprodukten und NEM mit Kurzfassungen und offiziellen Links. Für Fahrzeuge nutzen Sie Fahrzeugrückrufe (VIN oder Jahr/Marke/Modell, NHTSA).",
    heroQuickFda: "FDA-Rückrufe",
    heroQuickVehicle: "Fahrzeugrückrufe prüfen",
    searchPlaceholder: "Nach Überschrift oder Produkttyp suchen...",
    statRecalls: "Rückrufe erfasst",
    statSource: "Offizielle Quelle",
    statLangs: "Sprachen",
    statFree: "Kostenlos",
    sectionBrowse: "Nach Quelle",
    sectionChoose: "Kategorie wählen",
    fdaTitle: "FDA-Rückrufe",
    fdaBody:
      "Arzneimittel, Lebensmittel, Medizinprodukte, Nahrungsergänzung, Kosmetika und Biologika der FDA.",
    fdaCta: "FDA-Rückrufe →",
    vehicleTitle: "Fahrzeugrückrufe",
    vehicleBody: "Prüfung per VIN oder Fahrzeugdaten",
    vehicleCta: "Jetzt prüfen",
    aboutKicker: "Über diese Seite",
    aboutTitle: "Über Recalls Atlas",
    aboutP1:
      "Recalls Atlas bündelt öffentliche Rückrufinformationen von FDA und NHTSA. Starten Sie hier und folgen Sie dem offiziellen Hinweis.",
    aboutP2:
      "Kurzfassungen sind nur Orientierung. Bestätigen Sie Chargen, Daten und Anweisungen auf der verlinkten Quelle.",
    aboutP3Start: "Recalls Atlas ist ein ",
    aboutP3Strong: "unabhängiger Aggregator",
    aboutP3End:
      " und nicht mit FDA oder NHTSA verbunden. Daten nur zur Information. ",
    aboutLink: "Mehr erfahren →",
  },
  ja: {
    badge: "FDA.gov から毎日更新",
    badgeNhtsa: "NHTSA 車両安全データ",
    heroLine1: "米国リコールデータ、",
    heroLine2: "明確に検索可能",
    heroSub:
      "FDA の食品・医薬品・医療機器・サプリメントのリコールを検索（要約と公式リンク）。車両は「車両リコール」で VIN または年式・メーカー・車種から NHTSA の情報を確認できます。",
    heroQuickFda: "FDA リコールを見る",
    heroQuickVehicle: "車両リコールを確認",
    searchPlaceholder: "見出しまたは製品タイプで検索…",
    statRecalls: "追跡中",
    statSource: "公式ソース",
    statLangs: "言語",
    statFree: "無料",
    sectionBrowse: "ソース別",
    sectionChoose: "カテゴリを選ぶ",
    fdaTitle: "FDA リコール",
    fdaBody: "医薬品・食品・医療機器・サプリメント・化粧品・生物製剤など FDA のリコール。",
    fdaCta: "FDA リコールへ →",
    vehicleTitle: "車両リコール",
    vehicleBody: "VIN または車両情報で確認",
    vehicleCta: "確認する",
    aboutKicker: "このサイトについて",
    aboutTitle: "Recalls Atlas について",
    aboutP1:
      "Recalls Atlas は FDA と NHTSA の公開リコール情報をまとめます。ここから公式通知へ辿れます。",
    aboutP2: "要約は簡易向けです。ロット番号・日付・手順はリンク先の公式情報で確認してください。",
    aboutP3Start: "Recalls Atlas は",
    aboutP3Strong: "独立の集約サイト",
    aboutP3End: "であり FDA と NHTSA と提携していません。情報提供のみ。",
    aboutLink: "詳しく見る →",
  },
  pt: {
    badge: "Atualizado diariamente da FDA.gov",
    badgeNhtsa: "Dados de segurança veicular NHTSA",
    heroLine1: "Dados de recall nos EUA,",
    heroLine2: "Claros e pesquisáveis",
    heroSub:
      "Pesquise recalls FDA de alimentos, medicamentos, dispositivos e suplementos com resumos e links oficiais. Para veículos, use Recall de veículos com VIN ou ano/marca/modelo (NHTSA).",
    heroQuickFda: "Recalls FDA",
    heroQuickVehicle: "Recall de veículos",
    searchPlaceholder: "Pesquisar por título ou tipo de produto...",
    statRecalls: "Recalls acompanhados",
    statSource: "Fonte oficial",
    statLangs: "Idiomas",
    statFree: "Grátis",
    sectionBrowse: "Navegar por fonte",
    sectionChoose: "Escolha uma categoria",
    fdaTitle: "FDA Recalls",
    fdaBody:
      "Medicamentos, alimentos, dispositivos médicos, suplementos, cosméticos e biológicos recallados pela FDA.",
    fdaCta: "Ver recalls FDA →",
    vehicleTitle: "Recall de veículos",
    vehicleBody: "Consulte por VIN ou dados do veículo",
    vehicleCta: "Consultar",
    aboutKicker: "Sobre o site",
    aboutTitle: "Sobre o Recalls Atlas",
    aboutP1:
      "Recalls Atlas reúne informações públicas de recalls da FDA e NHTSA. Comece aqui e siga para o aviso oficial.",
    aboutP2:
      "Os resumos são orientativos. Confirme lotes, datas e instruções na fonte oficial vinculada.",
    aboutP3Start: "Recalls Atlas é um ",
    aboutP3Strong: "agregador independente",
    aboutP3End:
      " e não é afiliado à FDA ou NHTSA. Dados apenas informativos. ",
    aboutLink: "Saiba mais →",
  },
  hi: {
    badge: "FDA.gov से दैनिक अपडेट",
    badgeNhtsa: "NHTSA वाहन सुरक्षा डेटा",
    heroLine1: "अमेरिकी रिकॉल डेटा,",
    heroLine2: "स्पष्ट और खोज योग्य",
    heroSub:
      "FDA खाद्य, दवा, उपकरण और पूरक रिकॉल खोजें—सार और आधिकारिक लिंक। वाहनों के लिए VIN या वर्ष/निर्माता/मॉडल से NHTSA जाँच के लिए वाहन रिकॉल खोलें।",
    heroQuickFda: "FDA रिकॉल",
    heroQuickVehicle: "वाहन रिकॉल",
    searchPlaceholder: "शीर्षक या उत्पाद प्रकार से खोजें...",
    statRecalls: "ट्रैक किए गए रिकॉल",
    statSource: "आधिकारिक स्रोत",
    statLangs: "भाषाएँ",
    statFree: "मुफ़्त",
    sectionBrowse: "स्रोत के अनुसार",
    sectionChoose: "श्रेणी चुनें",
    fdaTitle: "FDA रिकॉल",
    fdaBody:
      "दवाएँ, खाद्य, चिकित्सा उपकरण, पूरक, सौंदर्य प्रसाधन और जैविक FDA रिकॉल।",
    fdaCta: "FDA रिकॉल देखें →",
    vehicleTitle: "वाहन रिकॉल",
    vehicleBody: "VIN या वाहन विवरण से जाँच करें",
    vehicleCta: "अभी जाँचें",
    aboutKicker: "इस साइट के बारे में",
    aboutTitle: "Recalls Atlas के बारे में",
    aboutP1:
      "Recalls Atlas FDA और NHTSA सार्वजनिक रिकॉल जानकारी एकत्र करता है। यहाँ से आधिकारिक सूचना तक पहुँचें।",
    aboutP2:
      "सारेक केवल संकेत के लिए। लॉट, तिथि और निर्देश हमेशा लिंक किए गए आधिकारिक स्रोत पर सत्यापित करें।",
    aboutP3Start: "Recalls Atlas एक ",
    aboutP3Strong: "स्वतंत्र समेकक",
    aboutP3End: " है और FDA और NHTSA से संबद्ध नहीं। डेटा केवल सूचनाथमक। ",
    aboutLink: "और जानें →",
  },
  ru: {
    badge: "Ежедневно с FDA.gov",
    badgeNhtsa: "Данные NHTSA по безопасности авто",
    heroLine1: "Данные отзывов США,",
    heroLine2: "Понятно и с поиском",
    heroSub:
      "Ищите отзывы FDA по продуктам, лекарствам, изделиям и БАД с краткими сводками и официальными ссылками. Для автомобилей откройте отзывы транспорта: VIN или год/марка/модель (NHTSA).",
    heroQuickFda: "Отзывы FDA",
    heroQuickVehicle: "Отзывы автомобилей",
    searchPlaceholder: "Поиск по заголовку или типу продукта...",
    statRecalls: "Отзывов отслеживается",
    statSource: "Официальный источник",
    statLangs: "Языков",
    statFree: "Бесплатно",
    sectionBrowse: "По источнику",
    sectionChoose: "Выберите категорию",
    fdaTitle: "Отзывы FDA",
    fdaBody:
      "Лекарства, продукты, медизделия, БАД, косметика и биологические препараты FDA.",
    fdaCta: "К отзывам FDA →",
    vehicleTitle: "Отзывы автомобилей",
    vehicleBody: "Проверка по VIN или данным авто",
    vehicleCta: "Проверить",
    aboutKicker: "О сайте",
    aboutTitle: "О Recalls Atlas",
    aboutP1:
      "Recalls Atlas собирает публичные данные отзывов FDA и NHTSA. Начните здесь и перейдите к официальному уведомлению.",
    aboutP2:
      "Краткие сводки для ориентира. Всегда проверяйте партии, даты и инструкции по ссылке на официальный источник.",
    aboutP3Start: "Recalls Atlas — ",
    aboutP3Strong: "независимый агрегатор",
    aboutP3End:
      " и не связан с FDA и NHTSA. Данные только для информации. ",
    aboutLink: "Подробнее →",
  },
  vi: {
    badge: "Cập nhật hàng ngày từ FDA.gov",
    badgeNhtsa: "Dữ liệu an toàn xe NHTSA",
    heroLine1: "Dữ liệu thu hồi Hoa Kỳ,",
    heroLine2: "Rõ ràng & có thể tìm kiếm",
    heroSub:
      "Tìm thu hồi FDA về thực phẩm, thuốc, thiết bị và thực phẩm chức năng với tóm tắt và liên kết chính thức. Xe cộ: mở Thu hồi xe để tra VIN hoặc năm/hãng/dòng (NHTSA).",
    heroQuickFda: "Thu hồi FDA",
    heroQuickVehicle: "Thu hồi xe",
    searchPlaceholder: "Tìm theo tiêu đề hoặc loại sản phẩm...",
    statRecalls: "Thu hồi được theo dõi",
    statSource: "Nguồn chính thức",
    statLangs: "Ngôn ngữ",
    statFree: "Miễn phí",
    sectionBrowse: "Duyệt theo nguồn",
    sectionChoose: "Chọn danh mục",
    fdaTitle: "Thu hồi FDA",
    fdaBody:
      "Thuốc, thực phẩm, thiết bị y tế, thực phẩm chức năng, mỹ phẩm và sinh học bị FDA thu hồi.",
    fdaCta: "Xem thu hồi FDA →",
    vehicleTitle: "Thu hồi xe",
    vehicleBody: "Kiểm tra bằng VIN hoặc thông tin xe",
    vehicleCta: "Kiểm tra ngay",
    aboutKicker: "About this site",
    aboutTitle: "About Recalls Atlas",
    aboutP1:
      "Recalls Atlas tổng hợp thông tin thu hồi công khai từ FDA và NHTSA. Bạn có thể bắt đầu tại đây và đi đến thông báo chính thức.",
    aboutP2:
      "Tóm tắt chỉ để tham khảo. Luôn xác nhận số lô, ngày và hướng dẫn tại nguồn chính thức được liên kết.",
    aboutP3Start: "Recalls Atlas là ",
    aboutP3Strong: "trang tổng hợp độc lập",
    aboutP3End:
      " và không liên kết với FDA hay NHTSA. Dữ liệu chỉ mang tính thông tin. ",
    aboutLink: "Tìm hiểu thêm →",
  },
};
