import type { SiteUiLang } from "@/lib/siteLocale";

export type HomeCopy = {
  badge: string;
  badgeNhtsa: string;
  badgeCpsc: string;
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  heroQuickFda: string;
  heroQuickVehicle: string;
  heroQuickGeneral: string;
  searchPlaceholder: string;
  statRecalls: string;
  statSourcesValue: string;
  statSources: string;
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
  generalTitle: string;
  generalBody: string;
  generalCta: string;
  generalIndexEmpty: string;
  generalIndexMore: string;
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
    badgeCpsc: "CPSC consumer product recalls",
    heroLine1: "U.S. Recall Data,",
    heroLine2: "Clear & Searchable",
    heroSub:
      "Search FDA food, drug, medical device, and supplement recalls—plus thousands of consumer product recalls (toys, appliances, furniture, and more) from the CPSC. For cars and trucks, use Vehicle recalls to look up open campaigns by VIN or year, make, and model (NHTSA).",
    heroQuickFda: "Browse FDA recalls",
    heroQuickVehicle: "Check vehicle recalls",
    heroQuickGeneral: "Browse product recalls",
    searchPlaceholder: "Search by headline or product type...",
    statRecalls: "Recalls Tracked",
    statSourcesValue: "3+",
    statSources: "Government sources",
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
    generalTitle: "Product recalls (CPSC)",
    generalBody:
      "Consumer product recalls from the U.S. Consumer Product Safety Commission—toys, electronics, home goods, furniture, sports equipment, and more.",
    generalCta: "Browse product recalls →",
    generalIndexEmpty:
      "No CPSC recalls are available in this build yet. Check back after data is synced.",
    generalIndexMore: "More recall pages are available via search and the site map.",
    aboutKicker: "About this site",
    aboutTitle: "About Recalls Atlas",
    aboutP1:
      "Recalls Atlas brings together public recall information from the FDA, NHTSA, and the U.S. Consumer Product Safety Commission (CPSC). Whether you are checking a medication, food product, medical device, a vehicle, or a household product, you can start here and follow through to the official government notice for full details.",
    aboutP2:
      "Summaries on this site are for quick orientation. Always confirm lot numbers, dates, and instructions on the FDA, NHTSA, or CPSC source linked directly from each recall page. We are committed to improving accessibility (WCAG-minded patterns, keyboard navigation, and readable contrast) and expanding support to more than 11 languages so recall information reaches more people worldwide.",
    aboutP3Start: "Recalls Atlas is an ",
    aboutP3Strong: "independent aggregator",
    aboutP3End:
      " and is not affiliated with or endorsed by the FDA, NHTSA, or CPSC. Data is compiled from public feeds and pages for informational purposes only. ",
    aboutLink: "Learn more →",
  },
  es: {
    badge: "Actualizado a diario desde FDA.gov",
    badgeNhtsa: "Datos de seguridad vehicular NHTSA",
    badgeCpsc: "Retiros de productos CPSC",
    heroLine1: "Datos de retiros en EE. UU.,",
    heroLine2: "Claros y buscables",
    heroSub:
      "Busque retiros FDA y miles de retiros de productos de consumo CPSC (juguetes, electrodomésticos, muebles y más). Para vehículos, consulte por VIN o año/marca/modelo (NHTSA).",
    heroQuickFda: "Ver retiros FDA",
    heroQuickVehicle: "Consultar vehículos",
    heroQuickGeneral: "Productos de consumo",
    searchPlaceholder: "Buscar por titular o tipo de producto...",
    statRecalls: "Retiros seguidos",
    statSourcesValue: "3+",
    statSources: "Fuentes gubernamentales",
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
    generalTitle: "Retiros de productos (CPSC)",
    generalBody:
      "Retiros de productos de consumo de la CPSC: juguetes, electrónica, hogar, muebles, deportes y más.",
    generalCta: "Ver productos CPSC →",
    generalIndexEmpty:
      "Aún no hay retiros CPSC en esta compilación. Vuelva cuando se sincronicen los datos.",
    generalIndexMore: "Hay más páginas de retiros en el mapa del sitio y la búsqueda.",
    aboutKicker: "Sobre este sitio",
    aboutTitle: "Acerca de Recalls Atlas",
    aboutP1:
      "Recalls Atlas reúne información pública de retiros de la FDA, la NHTSA y la CPSC. Puede empezar aquí y seguir hasta el aviso gubernamental oficial.",
    aboutP2:
      "Los resúmenes son orientativos. Confirme lotes, fechas e instrucciones en la fuente oficial enlazada en cada página.",
    aboutP3Start: "Recalls Atlas es un ",
    aboutP3Strong: "agregador independiente",
    aboutP3End:
      " y no está afiliado ni respaldado por la FDA, la NHTSA ni la CPSC. Los datos son solo informativos. ",
    aboutLink: "Más información →",
  },
  ar: {
    badge: "يُحدَّث يوميًا من FDA.gov",
    badgeNhtsa: "بيانات سلامة المركبات NHTSA",
    badgeCpsc: "استدعاءات منتجات المستهلك CPSC",
    heroLine1: "بيانات الاستدعاءات الأمريكية،",
    heroLine2: "واضحة وقابلة للبحث",
    heroSub:
      "ابحث عن استدعاءات FDA وآلاف استدعاءات منتجات CPSC (ألعاب، أجهزة، أثاث وغيرها). للمركبات، استخدم استدعاءات المركبات برقم الشاصي أو السنة/الصنع/الطراز (NHTSA).",
    heroQuickFda: "استدعاءات FDA",
    heroQuickVehicle: "استدعاءات المركبات",
    heroQuickGeneral: "منتجات استهلاكية",
    searchPlaceholder: "ابحث بالعنوان أو نوع المنتج...",
    statRecalls: "استدعاءات متتبّعة",
    statSourcesValue: "+٣",
    statSources: "مصادر حكومية",
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
    generalTitle: "منتجات استهلاكية (CPSC)",
    generalBody:
      "استدعاءات من لجنة سلامة المنتجات الاستهلاكية: ألعاب وإلكترونيات ومنزل وأثاث ورياضة وغيرها.",
    generalCta: "تصفح منتجات CPSC ←",
    generalIndexEmpty: "لا توجد بيانات CPSC في هذا الإصدار بعد.",
    generalIndexMore: "المزيد من الصفحات متاح عبر خريطة الموقع والبحث.",
    aboutKicker: "عن الموقع",
    aboutTitle: "About Recalls Atlas",
    aboutP1:
      "يجمع Recalls Atlas معلومات الاستدعاءات العامة من FDA وNHTSA وCPSC. يمكنك البدء هنا والانتقال إلى الإشعار الحكومي الرسمي.",
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
    badgeCpsc: "CPSC 消费品召回",
    heroLine1: "美国召回数据，",
    heroLine2: "清晰可搜索",
    heroSub:
      "搜索 FDA 食品、药品、器械与补充剂召回，以及 CPSC 发布的大量消费品召回（玩具、家电、家具等）。车辆请按 VIN 或年款/品牌/车型查询（NHTSA）。",
    heroQuickFda: "浏览 FDA 召回",
    heroQuickVehicle: "车辆召回查询",
    heroQuickGeneral: "浏览消费品召回",
    searchPlaceholder: "按标题或产品类型搜索…",
    statRecalls: "已收录召回",
    statSourcesValue: "3+",
    statSources: "政府机构",
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
    generalTitle: "消费品召回（CPSC）",
    generalBody:
      "美国消费品安全委员会发布的召回：玩具、电子、家居、家具、运动器材等。",
    generalCta: "查看 CPSC 召回 →",
    generalIndexEmpty: "当前版本尚无 CPSC 数据，同步后即可浏览。",
    generalIndexMore: "更多召回页面可通过站点地图与搜索发现。",
    aboutKicker: "关于本站",
    aboutTitle: "关于 Recalls Atlas",
    aboutP1:
      "Recalls Atlas 汇总 FDA、NHTSA 与 CPSC 的公开召回信息。您可在此开始并跳转到官方完整公告。",
    aboutP2: "摘要仅供快速了解。请务必在链接的 FDA/NHTSA 来源核实批号、日期与说明。",
    aboutP3Start: "Recalls Atlas 为",
    aboutP3Strong: "独立聚合网站",
    aboutP3End: "，不隶属于 FDA 或 NHTSA。数据仅供参考。",
    aboutLink: "了解更多 →",
  },
  fr: {
    badge: "Mis à jour quotidiennement depuis FDA.gov",
    badgeNhtsa: "Données sécurité véhicules NHTSA",
    badgeCpsc: "Rappels produits CPSC",
    heroLine1: "Données de rappels américains,",
    heroLine2: "Claires et consultables",
    heroSub:
      "Rappels FDA et milliers de rappels de produits de consommation CPSC (jouets, électroménager, meubles). Véhicules : VIN ou année/marque/modèle (NHTSA).",
    heroQuickFda: "Rappels FDA",
    heroQuickVehicle: "Rappels véhicules",
    heroQuickGeneral: "Produits de consommation",
    searchPlaceholder: "Rechercher par titre ou type de produit...",
    statRecalls: "Rappels suivis",
    statSourcesValue: "3+",
    statSources: "Sources publiques",
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
    generalTitle: "Rappels produits (CPSC)",
    generalBody:
      "Rappels CPSC : jouets, électronique, maison, meubles, sports et plus.",
    generalCta: "Voir les rappels CPSC →",
    generalIndexEmpty: "Aucun rappel CPSC dans cette version pour l’instant.",
    generalIndexMore: "D’autres pages sont listées dans le plan du site et la recherche.",
    aboutKicker: "À propos",
    aboutTitle: "À propos de Recalls Atlas",
    aboutP1:
      "Recalls Atlas regroupe les rappels publics de la FDA, de la NHTSA et de la CPSC. Commencez ici et suivez le lien vers l’avis officiel.",
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
    badgeCpsc: "CPSC-Verbraucherprodukte",
    heroLine1: "US-Rückrufdaten,",
    heroLine2: "Klar & durchsuchbar",
    heroSub:
      "FDA-Rückrufe plus tausende CPSC-Rückrufe für Verbraucherprodukte (Spielzeug, Haushalt, Möbel). Fahrzeuge: VIN oder Jahr/Marke/Modell (NHTSA).",
    heroQuickFda: "FDA-Rückrufe",
    heroQuickVehicle: "Fahrzeugrückrufe prüfen",
    heroQuickGeneral: "Verbraucherprodukte",
    searchPlaceholder: "Nach Überschrift oder Produkttyp suchen...",
    statRecalls: "Rückrufe erfasst",
    statSourcesValue: "3+",
    statSources: "Behördenquellen",
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
    generalTitle: "Produktrückrufe (CPSC)",
    generalBody:
      "CPSC-Rückrufe: Spielzeug, Elektronik, Haushalt, Möbel, Sport und mehr.",
    generalCta: "CPSC-Rückrufe →",
    generalIndexEmpty: "In diesem Build sind noch keine CPSC-Rückrufe vorhanden.",
    generalIndexMore: "Weitere Seiten finden Sie über die Sitemap und Suche.",
    aboutKicker: "Über diese Seite",
    aboutTitle: "Über Recalls Atlas",
    aboutP1:
      "Recalls Atlas bündelt öffentliche Rückrufinformationen von FDA, NHTSA und CPSC. Starten Sie hier und folgen Sie dem offiziellen Hinweis.",
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
    badgeCpsc: "CPSC 消費財リコール",
    heroLine1: "米国リコールデータ、",
    heroLine2: "明確に検索可能",
    heroSub:
      "FDA のリコールに加え、CPSC の多数の消費財リコール（玩具・家電・家具など）を掲載。車両は VIN または年式・メーカー・車種（NHTSA）。",
    heroQuickFda: "FDA リコールを見る",
    heroQuickVehicle: "車両リコールを確認",
    heroQuickGeneral: "消費財リコール",
    searchPlaceholder: "見出しまたは製品タイプで検索…",
    statRecalls: "追跡中",
    statSourcesValue: "3+",
    statSources: "政府ソース",
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
    generalTitle: "製品リコール（CPSC）",
    generalBody:
      "CPSC の消費財リコール：玩具・電子機器・住宅・家具・スポーツなど。",
    generalCta: "CPSC リコールへ →",
    generalIndexEmpty: "このビルドにはまだ CPSC データがありません。",
    generalIndexMore: "その他のページはサイトマップと検索からご覧ください。",
    aboutKicker: "このサイトについて",
    aboutTitle: "Recalls Atlas について",
    aboutP1:
      "Recalls Atlas は FDA・NHTSA・CPSC の公開リコール情報をまとめます。ここから公式通知へ辿れます。",
    aboutP2: "要約は簡易向けです。ロット番号・日付・手順はリンク先の公式情報で確認してください。",
    aboutP3Start: "Recalls Atlas は",
    aboutP3Strong: "独立の集約サイト",
    aboutP3End: "であり FDA と NHTSA と提携していません。情報提供のみ。",
    aboutLink: "詳しく見る →",
  },
  pt: {
    badge: "Atualizado diariamente da FDA.gov",
    badgeNhtsa: "Dados de segurança veicular NHTSA",
    badgeCpsc: "Recalls de produtos CPSC",
    heroLine1: "Dados de recall nos EUA,",
    heroLine2: "Claros e pesquisáveis",
    heroSub:
      "Recalls FDA e milhares de recalls CPSC de produtos de consumo (brinquedos, eletrodomésticos, móveis). Veículos: VIN ou ano/marca/modelo (NHTSA).",
    heroQuickFda: "Recalls FDA",
    heroQuickVehicle: "Recall de veículos",
    heroQuickGeneral: "Produtos de consumo",
    searchPlaceholder: "Pesquisar por título ou tipo de produto...",
    statRecalls: "Recalls acompanhados",
    statSourcesValue: "3+",
    statSources: "Fontes governamentais",
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
    generalTitle: "Recalls de produtos (CPSC)",
    generalBody:
      "Recalls CPSC: brinquedos, eletrônicos, casa, móveis, esportes e mais.",
    generalCta: "Ver recalls CPSC →",
    generalIndexEmpty: "Nenhum recall CPSC nesta versão ainda.",
    generalIndexMore: "Há mais páginas no mapa do site e na busca.",
    aboutKicker: "Sobre o site",
    aboutTitle: "Sobre o Recalls Atlas",
    aboutP1:
      "Recalls Atlas reúne recalls públicos da FDA, NHTSA e CPSC. Comece aqui e siga para o aviso oficial.",
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
    badgeCpsc: "CPSC उपभोक्ता उत्पाद रिकॉल",
    heroLine1: "अमेरिकी रिकॉल डेटा,",
    heroLine2: "स्पष्ट और खोज योग्य",
    heroSub:
      "FDA रिकॉल के साथ हज़ारों CPSC उपभोक्ता उत्पाद रिकॉल (खिलौने, उपकरण, फर्नीचर)। वाहन: VIN या वर्ष/निर्माता/मॉडल (NHTSA)।",
    heroQuickFda: "FDA रिकॉल",
    heroQuickVehicle: "वाहन रिकॉल",
    heroQuickGeneral: "उपभोक्ता उत्पाद",
    searchPlaceholder: "शीर्षक या उत्पाद प्रकार से खोजें...",
    statRecalls: "ट्रैक किए गए रिकॉल",
    statSourcesValue: "3+",
    statSources: "सरकारी स्रोत",
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
    generalTitle: "उत्पाद रिकॉल (CPSC)",
    generalBody:
      "CPSC उपभोक्ता रिकॉल: खिलौने, इलेक्ट्रॉनिक्स, घर, फर्नीचर, खेल और अधिक।",
    generalCta: "CPSC रिकॉल देखें →",
    generalIndexEmpty: "इस बिल्ड में अभी कोई CPSC डेटा नहीं है।",
    generalIndexMore: "अधिक पृष्ठ साइटमैप और खोज से मिलेंगे।",
    aboutKicker: "इस साइट के बारे में",
    aboutTitle: "Recalls Atlas के बारे में",
    aboutP1:
      "Recalls Atlas FDA, NHTSA और CPSC सार्वजनिक रिकॉल जानकारी एकत्र करता है। यहाँ से आधिकारिक सूचना तक पहुँचें।",
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
    badgeCpsc: "Отзывы товаров CPSC",
    heroLine1: "Данные отзывов США,",
    heroLine2: "Понятно и с поиском",
    heroSub:
      "Отзывы FDA и тысячи отзывов потребительских товаров CPSC (игрушки, техника, мебель). Авто: VIN или год/марка/модель (NHTSA).",
    heroQuickFda: "Отзывы FDA",
    heroQuickVehicle: "Отзывы автомобилей",
    heroQuickGeneral: "Потребительские товары",
    searchPlaceholder: "Поиск по заголовку или типу продукта...",
    statRecalls: "Отзывов отслеживается",
    statSourcesValue: "3+",
    statSources: "Государственные источники",
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
    generalTitle: "Отзывы товаров (CPSC)",
    generalBody:
      "Отзывы CPSC: игрушки, электроника, дом, мебель, спорт и другое.",
    generalCta: "К отзывам CPSC →",
    generalIndexEmpty: "В этой сборке пока нет данных CPSC.",
    generalIndexMore: "Другие страницы — в карте сайта и поиске.",
    aboutKicker: "О сайте",
    aboutTitle: "О Recalls Atlas",
    aboutP1:
      "Recalls Atlas собирает публичные отзывы FDA, NHTSA и CPSC. Начните здесь и перейдите к официальному уведомлению.",
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
    badgeCpsc: "Thu hồi sản phẩm CPSC",
    heroLine1: "Dữ liệu thu hồi Hoa Kỳ,",
    heroLine2: "Rõ ràng & có thể tìm kiếm",
    heroSub:
      "Thu hồi FDA và hàng nghìn thu hồi sản phẩm tiêu dùng CPSC (đồ chơi, điện, nội thất). Xe: VIN hoặc năm/hãng/dòng (NHTSA).",
    heroQuickFda: "Thu hồi FDA",
    heroQuickVehicle: "Thu hồi xe",
    heroQuickGeneral: "Sản phẩm tiêu dùng",
    searchPlaceholder: "Tìm theo tiêu đề hoặc loại sản phẩm...",
    statRecalls: "Thu hồi được theo dõi",
    statSourcesValue: "3+",
    statSources: "Nguồn chính phủ",
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
    generalTitle: "Thu hồi sản phẩm (CPSC)",
    generalBody:
      "Thu hồi CPSC: đồ chơi, điện tử, gia dụng, nội thất, thể thao và hơn nữa.",
    generalCta: "Xem thu hồi CPSC →",
    generalIndexEmpty: "Chưa có dữ liệu CPSC trong bản build này.",
    generalIndexMore: "Xem thêm trên sơ đồ trang và tìm kiếm.",
    aboutKicker: "About this site",
    aboutTitle: "About Recalls Atlas",
    aboutP1:
      "Recalls Atlas tổng hợp thu hồi công khai từ FDA, NHTSA và CPSC. Bạn có thể bắt đầu tại đây và đi đến thông báo chính thức.",
    aboutP2:
      "Tóm tắt chỉ để tham khảo. Luôn xác nhận số lô, ngày và hướng dẫn tại nguồn chính thức được liên kết.",
    aboutP3Start: "Recalls Atlas là ",
    aboutP3Strong: "trang tổng hợp độc lập",
    aboutP3End:
      " và không liên kết với FDA hay NHTSA. Dữ liệu chỉ mang tính thông tin. ",
    aboutLink: "Tìm hiểu thêm →",
  },
};
