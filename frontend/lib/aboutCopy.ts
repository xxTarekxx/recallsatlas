import type { SiteUiLang } from "@/lib/siteLocale";

/** Condensed about page (full legal tone in English; localized summaries elsewhere). */
export const ABOUT_COPY: Record<
  SiteUiLang,
  { title: string; paragraphs: string[]; privacyLabel: string }
> = {
  en: {
    title: "About Recalls Atlas",
    privacyLabel: "Privacy Policy",
    paragraphs: [
      "Recalls Atlas is an independent public-interest website that aggregates product recall notices published by the U.S. Food & Drug Administration (FDA). Our goal is to make recall information easier to search, browse, and understand — in plain language and across more than 11 languages.",
      "We are not affiliated with, endorsed by, or sponsored by the FDA, the National Highway Traffic Safety Administration (NHTSA), or any other government agency. All recall data originates from official government sources and is reproduced here for informational purposes only.",
      "All FDA recall information displayed on this site is sourced directly from the official FDA Recalls, Market Withdrawals & Safety Alerts database at FDA.gov. Data is updated regularly. Vehicle recall data from NHTSA is integrated where available.",
      "While we strive to present accurate recall information, Recalls Atlas is not a substitute for official government sources. Translations (other than English) are AI-generated and may not be 100% accurate. Always verify critical information with the FDA or NHTSA.",
      "Recalls Atlas is built with accessibility in mind (WCAG-minded patterns). For questions, feedback, or corrections, email contact@recallsatlas.com.",
      "For how we handle data and cookies, see our Privacy Policy. Recalls Atlas is not responsible for decisions made based on information found on this site — always verify with the issuing authority.",
    ],
  },
  es: {
    title: "Acerca de Recalls Atlas",
    privacyLabel: "Política de privacidad",
    paragraphs: [
      "Recalls Atlas es un sitio independiente que agrega avisos de retiro publicados por la FDA de EE. UU. Buscamos facilitar la búsqueda y comprensión en más de 11 idiomas.",
      "No estamos afiliados ni respaldados por la FDA, la NHTSA ni ningún organismo gubernamental. Los datos provienen de fuentes oficiales y se muestran solo con fines informativos.",
      "La información de la FDA proviene de la base oficial en FDA.gov y se actualiza con regularidad. Los datos de vehículos NHTSA se integran cuando están disponibles.",
      "Las traducciones pueden ser generadas por IA y no sustituyen las fuentes oficiales. Verifique siempre la información crítica con la FDA o la NHTSA.",
      "Para accesibilidad y buenas prácticas WCAG, contacte contact@recallsatlas.com. Consulte nuestra política de privacidad sobre datos y cookies.",
    ],
  },
  ar: {
    title: "عن Recalls Atlas",
    privacyLabel: "سياسة الخصوصية",
    paragraphs: [
      "Recalls Atlas موقع مستقل يجمع إشعارات الاستدعاء المنشورة من FDA. هدفنا تسهيل البحث والفهم بأكثر من 11 لغة.",
      "لسنا تابعين لـ FDA أو NHTSA أو أي جهة حكومية. البيانات من مصادر رسمية ولأغراض معلوماتية فقط.",
      "معلومات FDA من قاعدة FDA.gov الرسمية وتُحدَّث بانتظام. تُدمج بيانات NHTSA للمركبات عند التوفر.",
      "الترجمات قد تكون آلية ولا تحل محل المصادر الرسمية. تحقق دائمًا من المعلومات الحرجة.",
      "للاستفسارات: contact@recallsatlas.com. راجع سياسة الخصوصية.",
    ],
  },
  zh: {
    title: "关于 Recalls Atlas",
    privacyLabel: "隐私政策",
    paragraphs: [
      "Recalls Atlas 是独立网站，汇总美国 FDA 发布的召回公告，帮助以 11 种以上语言更易搜索与理解。",
      "我们不隶属于 FDA、NHTSA 或任何政府机构。数据来自官方来源，仅供参考。",
      "FDA 信息来自 FDA.gov 官方数据库并定期更新。NHTSA 车辆数据在可用时整合。",
      "翻译可能由 AI 生成，不能替代官方来源。重要信息请务必向 FDA/NHTSA 核实。",
      "联系：contact@recallsatlas.com。请参阅隐私政策。",
    ],
  },
  fr: {
    title: "À propos de Recalls Atlas",
    privacyLabel: "Politique de confidentialité",
    paragraphs: [
      "Recalls Atlas est un site indépendant qui agrège les avis de rappel publiés par la FDA américaine, pour faciliter la recherche et la compréhension en plus de 11 langues.",
      "Nous ne sommes pas affiliés à la FDA, à la NHTSA ni à un organisme gouvernemental. Les données proviennent de sources officielles et sont fournies à titre informatif.",
      "Les informations FDA proviennent de la base officielle FDA.gov et sont mises à jour régulièrement. Les données véhicules NHTSA sont intégrées lorsque disponibles.",
      "Les traductions peuvent être générées par IA et ne remplacent pas les sources officielles. Vérifiez toujours les informations critiques.",
      "Contact : contact@recallsatlas.com. Voir la politique de confidentialité.",
    ],
  },
  de: {
    title: "Über Recalls Atlas",
    privacyLabel: "Datenschutz",
    paragraphs: [
      "Recalls Atlas ist eine unabhängige Website, die Rückrufhinweise der US-FDA bündelt – durchsuchbar und in über 11 Sprachen verständlich.",
      "Wir sind nicht mit FDA, NHTSA oder Behörden verbunden. Daten stammen aus offiziellen Quellen und dienen nur der Information.",
      "FDA-Informationen kommen aus der offiziellen FDA.gov-Datenbank und werden regelmäßig aktualisiert. NHTSA-Fahrzeugdaten werden eingebunden, wenn verfügbar.",
      "Übersetzungen können KI-generiert sein und ersetzen keine offiziellen Quellen. Wichtige Angaben immer dort prüfen.",
      "Kontakt: contact@recallsatlas.com. Siehe Datenschutzerklärung.",
    ],
  },
  ja: {
    title: "Recalls Atlas について",
    privacyLabel: "プライバシーポリシー",
    paragraphs: [
      "Recalls Atlas は米国 FDA のリコール情報をまとめる独立サイトです。11 言語以上で検索・理解しやすくします。",
      "FDA・NHTSA・政府とは提携していません。データは公式ソースに基づき参考情報です。",
      "FDA 情報は FDA.gov の公式データベースから定期更新。NHTSA の車両データは利用可能な範囲で統合します。",
      "翻訳は AI による場合があり、公式情報に代わりません。重要事項は必ず公式で確認してください。",
      "お問い合わせ: contact@recallsatlas.com。プライバシーポリシーをご覧ください。",
    ],
  },
  pt: {
    title: "Sobre o Recalls Atlas",
    privacyLabel: "Política de privacidade",
    paragraphs: [
      "Recalls Atlas é um site independente que agrega avisos de recall publicados pela FDA dos EUA, com busca e compreensão em mais de 11 idiomas.",
      "Não somos afiliados à FDA, NHTSA ou órgãos governamentais. Os dados vêm de fontes oficiais e são apenas informativos.",
      "Informações da FDA vêm do banco oficial em FDA.gov e são atualizadas regularmente. Dados de veículos NHTSA são integrados quando disponíveis.",
      "Traduções podem ser geradas por IA e não substituem fontes oficiais. Sempre verifique informações críticas.",
      "Contato: contact@recallsatlas.com. Veja a política de privacidade.",
    ],
  },
  hi: {
    title: "Recalls Atlas के बारे में",
    privacyLabel: "गोपनीयता नीति",
    paragraphs: [
      "Recalls Atlas एक स्वतंत्र साइट है जो अमेरिकी FDA द्वारा जारी रिकॉल सूचनाओं को एकत्र करती है — 11+ भाषाओं में खोज और समझ आसान।",
      "हम FDA, NHTSA या किसी सरकारी संगठन से जुड़े नहीं हैं। डेटा आधिकारिक स्रोतों से है और केवल सूचनाथमक है।",
      "FDA जानकारी आधिकारिक FDA.gov डेटाबेस से नियमित अपडेट। उपलब्ध होने पर NHTSA वाहन डेटा शामिल।",
      "अनुवाद AI से हो सकते हैं और आधिकारिक स्रोतों का स्थान नहीं लेते। महत्वपूर्ण जानकारी हमेशा सत्यापित करें।",
      "संपर्क: contact@recallsatlas.com। गोपनीयता नीति देखें।",
    ],
  },
  ru: {
    title: "О Recalls Atlas",
    privacyLabel: "Политика конфиденциальности",
    paragraphs: [
      "Recalls Atlas — независимый сайт, собирающий уведомления об отзывах FDA США; поиск и понимание на 11+ языках.",
      "Мы не связаны с FDA, NHTSA или госорганами. Данные из официальных источников, только для информации.",
      "Сведения FDA из официальной базы FDA.gov регулярно обновляются. Данные NHTSA по авто подключаются при наличии.",
      "Переводы могут быть ИИ и не заменяют официальные источники. Проверяйте критичную информацию.",
      "Связь: contact@recallsatlas.com. См. политику конфиденциальности.",
    ],
  },
  vi: {
    title: "About Recalls Atlas",
    privacyLabel: "Privacy Policy",
    paragraphs: [
      "Recalls Atlas là trang độc lập tổng hợp thông báo thu hồi của FDA Hoa Kỳ — tìm kiếm và hiểu rõ hơn với hơn 11 ngôn ngữ.",
      "Chúng tôi không liên kết với FDA, NHTSA hay cơ quan nhà nước. Dữ liệu từ nguồn chính thức, chỉ mang tính thông tin.",
      "Thông tin FDA từ cơ sở dữ liệu chính thức FDA.gov, cập nhật định kỳ. Dữ liệu xe NHTSA được tích hợp khi có.",
      "Bản dịch có thể do AI và không thay thế nguồn chính thức. Luôn xác minh thông tin quan trọng.",
      "Liên hệ: contact@recallsatlas.com. Xem chính sách bảo mật.",
    ],
  },
};
