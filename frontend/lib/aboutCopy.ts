import type { SiteUiLang } from "@/lib/siteLocale";

export type AboutSection = { heading?: string; paragraphs: string[] };

/** About page — aligned with footer: FDA, NHTSA, CPSC public-service notices; no endorsement. */
export const ABOUT_COPY: Record<
  SiteUiLang,
  { title: string; paragraphs: string[]; privacyLabel: string; sections?: AboutSection[] }
> = {
  en: {
    title: "About Recalls Atlas",
    privacyLabel: "Privacy Policy",
    paragraphs: [],
    sections: [
      {
        heading: "Our Mission",
        paragraphs: [
          "Recalls Atlas is an independent, public-interest website dedicated to making U.S. product recall information accurate, accessible, and easy to act on. We monitor recall announcements published by three federal agencies — the U.S. Food and Drug Administration (FDA) for food, drugs, medical devices, and dietary supplements; the National Highway Traffic Safety Administration (NHTSA) for vehicle safety campaigns; and the Consumer Product Safety Commission (CPSC) for consumer products including toys, appliances, and household goods — and present them in a clear, structured format for the public.",
        ],
      },
      {
        heading: "What We Publish and How",
        paragraphs: [
          "Every recall notice on Recalls Atlas is sourced directly from official government databases and agency pages. For each notice, we produce a structured summary that clearly identifies the products affected (including lot numbers, UPC codes, and date ranges where available), the reason for the recall, the risk to consumers, and what steps consumers should take. We include company contact information so affected consumers can act quickly.",
          "We do not alter, editorialize, or downplay the factual details published by the agencies. Our goal is to make the information faster to find and easier to understand — not to change it. Every page links directly to the original government source notice so you can verify every detail independently.",
        ],
      },
      {
        heading: "Our Sources",
        paragraphs: [
          "All recall data originates exclusively from official public sources: FDA enforcement reports and safety alerts at FDA.gov, NHTSA vehicle safety recall filings at NHTSA.gov, and CPSC consumer product recall announcements at CPSC.gov. We do not publish recall information from unverified third-party sources. Our database is updated regularly to reflect new notices and agency updates.",
          "Recalls Atlas is not affiliated with, endorsed by, or sponsored by any government agency. The FDA, NHTSA, and CPSC post recall announcements as a public service and do not endorse any product or company; neither does Recalls Atlas.",
        ],
      },
      {
        heading: "Accuracy and Corrections",
        paragraphs: [
          "We are committed to publishing accurate, up-to-date information. If you believe any information on this site contains an error or is no longer current, please contact us at contact@recallsatlas.com and we will review and correct it promptly. For the definitive and most current status of any recall, always refer to the official government source linked from each recall page.",
        ],
      },
      {
        heading: "Editorial Independence",
        paragraphs: [
          "Recalls Atlas does not accept payment to feature, suppress, or prioritize any recall notice. We do not endorse any recalled product, brand, or company. All content is selected and published on the basis of what has been officially announced by U.S. regulatory agencies — not commercial relationships.",
        ],
      },
      {
        heading: "Contact Us",
        paragraphs: [
          "For questions, corrections, or feedback about this site, email us at contact@recallsatlas.com. For questions about a specific recall — including whether your product is affected, how to get a refund or remedy, or what to do next — please use the contact information provided by the recalling company or the relevant government agency notice, not Recalls Atlas.",
        ],
      },
    ],
  },
  es: {
    title: "Acerca de Recalls Atlas",
    privacyLabel: "Política de privacidad",
    paragraphs: [
      "Recalls Atlas es un sitio independiente que agrega información pública de retiros de EE. UU.: FDA (alimentos, medicamentos, dispositivos, suplementos), NHTSA (vehículos) y CPSC (productos de consumo como juguetes y electrodomésticos). Buscamos facilitar la búsqueda y la comprensión en muchos idiomas.",
      "La FDA, la NHTSA y la CPSC publican avisos de retiro como servicio público y no respaldan productos ni empresas. Recalls Atlas no está afiliado ni respaldado por ningún organismo. Reproducimos información pública solo con fines informativos y tampoco respaldamos productos, marcas ni empresas.",
      "Los datos provienen de bases y páginas públicas oficiales (FDA.gov, NHTSA.gov, CPSC, etc.) y se actualizan con regularidad. No sustituye las fuentes oficiales.",
      "Las traducciones pueden ser por IA: confirme siempre en la fuente oficial. Para un retiro concreto, use los datos de contacto de la empresa o del aviso oficial, no Recalls Atlas.",
      "Accesibilidad (buenas prácticas tipo WCAG). Contacto: contact@recallsatlas.com.",
      "Privacidad, cookies y analítica: véase la Política de privacidad. Sin responsabilidad por decisiones basadas en este sitio.",
    ],
  },
  ar: {
    title: "عن Recalls Atlas",
    privacyLabel: "سياسة الخصوصية",
    paragraphs: [
      "Recalls Atlas موقع مستقل يجمع معلومات الاستدعاءات الأمريكية من مصادر حكومية علنية: FDA (الأغذية والأدوية والأجهزة والمكملات) وNHTSA (المركبات) وCPSC (منتجات استهلاكية مثل الألعاب والأجهزة). هدفنا تسهيل البحث والفهم بعدة لغات.",
      "تنشر FDA وNHTSA وCPSC إعلانات الاستدعاء كخدمة عامة ولا توافق على منتجات أو شركات. Recalls Atlas غير تابع لأي جهة حكومية ويعيد نشر معلومات علنية لأغراض معلوماتية فقط ولا يوافق على منتجات أو شركات.",
      "البيانات من قواعد وصفحات رسمية علنية وتُحدَّث بانتظام. لا يغني عن المصادر الرسمية.",
      "الترجمات قد تكون آلية—تحقق من المصدر الرسمي. للاستفسار عن استدعاء معيّن استخدم بيانات الجهة المُصدِرة أو الإشعار الرسمي.",
      "للتواصل: contact@recallsatlas.com. راجع سياسة الخصوصية للبيانات والتحليلات.",
    ],
  },
  zh: {
    title: "关于 Recalls Atlas",
    privacyLabel: "隐私政策",
    paragraphs: [
      "Recalls Atlas 是独立公益网站，汇总美国政府公开发布的召回信息：FDA（食品、药品、器械、补充剂）、NHTSA（车辆）、CPSC（玩具、家电等消费品）。我们致力于以简明语言和多语言呈现，便于检索与理解。",
      "FDA、NHTSA 与 CPSC 将召回公告作为公共服务发布，不背书任何产品或公司。Recalls Atlas 不隶属于任何政府机构，仅转载与摘要公开信息，仅供参考，亦不背书任何产品、品牌或公司。",
      "数据来自 FDA.gov、NHTSA.gov、CPSC 等官方公开数据库与页面，并定期更新。不能替代官方来源。",
      "译文可能由 AI 生成—请务必以各页链接的官方来源为准。具体召回事宜请使用发布企业或机构公告上的联系方式。",
      "联系：contact@recallsatlas.com。网站使用中的分析、Cookie 等请参阅隐私政策。",
    ],
  },
  fr: {
    title: "À propos de Recalls Atlas",
    privacyLabel: "Politique de confidentialité",
    paragraphs: [
      "Recalls Atlas est un site indépendant qui agrège les rappels américains issus de sources publiques : FDA (aliments, médicaments, dispositifs, compléments), NHTSA (véhicules), CPSC (produits de consommation). Nous visons à faciliter la recherche et la compréhension en plusieurs langues.",
      "La FDA, la NHTSA et la CPSC publient les rappels comme service public et n’approuvent aucun produit ni entreprise. Recalls Atlas n’est affilié à aucun organisme public ; nous reprenons l’information publique à titre informatif et n’approuvons aucun produit, marque ou entreprise.",
      "Les données proviennent des bases officielles ouvertes (FDA.gov, NHTSA.gov, CPSC, etc.) et sont mises à jour régulièrement. Ceci ne remplace pas les sources officielles.",
      "Traductions possibles par IA : vérifiez toujours la source officielle. Pour un rappel précis, utilisez les coordonnées de l’entreprise ou de l’avis officiel.",
      "Contact : contact@recallsatlas.com. Données d’usage, cookies : voir la politique de confidentialité.",
    ],
  },
  de: {
    title: "Über Recalls Atlas",
    privacyLabel: "Datenschutz",
    paragraphs: [
      "Recalls Atlas ist eine unabhängige Website, die US-Rückrufinformationen aus öffentlichen Behördenquellen bündelt: FDA (Lebensmittel, Arzneimittel, Medizinprodukte, NEM), NHTSA (Fahrzeuge), CPSC (Verbraucherprodukte). Ziel: bessere Auffindbarkeit und Verständlichkeit in vielen Sprachen.",
      "FDA, NHTSA und CPSC veröffentlichen Rückrufbekanntmachungen als öffentlichen Service und befürworten keine Produkte oder Unternehmen. Recalls Atlas ist nicht mit Behörden verbunden; wir nutzen öffentliche Informationen nur informativ und befürworten keine Produkte, Marken oder Unternehmen.",
      "Daten stammen von offiziellen öffentlichen Datenbanken und Seiten (u. a. FDA.gov, NHTSA.gov, CPSC) und werden regelmäßig aktualisiert. Kein Ersatz für die Originalquellen.",
      "Übersetzungen können KI-generiert sein—bitte offizielle Quellen prüfen. Bei konkreten Rückrufen: Kontaktdaten des Unternehmens oder Behördenhinweises nutzen.",
      "Kontakt: contact@recallsatlas.com. Nutzungsdaten und Cookies: siehe Datenschutzerklärung.",
    ],
  },
  ja: {
    title: "Recalls Atlas について",
    privacyLabel: "プライバシーポリシー",
    paragraphs: [
      "Recalls Atlas は、米国政府の公開ソースからリコール情報を集約する独立サイトです。FDA（食品・医薬品・医療機器・サプリメント）、NHTSA（車両）、CPSC（玩具・家電など消費財）を対象とし、検索と理解を多言語で支援します。",
      "FDA・NHTSA・CPSC はリコール情報を公共サービスとして公表し、製品や企業を推奨しません。Recalls Atlas は政府と無関係で、公開情報を参考のためにまとめるだけであり、製品・ブランド・企業を推奨しません。",
      "データは FDA.gov、NHTSA.gov、CPSC 等の公式公開データに基づき定期更新します。公式情報の代替ではありません。",
      "翻訳は AI による場合があります—各ページの公式リンクで必ず確認してください。個別のお問い合わせは発表企業または官公庁通知の連絡先をご利用ください。",
      "お問い合わせ: contact@recallsatlas.com。アクセス解析・Cookie 等はプライバシーポリシーをご覧ください。",
    ],
  },
  pt: {
    title: "Sobre o Recalls Atlas",
    privacyLabel: "Política de privacidade",
    paragraphs: [
      "Recalls Atlas é um site independente que agrega recalls dos EUA a partir de fontes públicas: FDA (alimentos, medicamentos, dispositivos, suplementos), NHTSA (veículos), CPSC (produtos de consumo). Objetivo: facilitar busca e compreensão em vários idiomas.",
      "A FDA, NHTSA e CPSC publicam recalls como serviço público e não endossam produtos nem empresas. Recalls Atlas não é afiliado a órgãos públicos; reproduzimos informação pública apenas informativamente e também não endossamos produtos, marcas ou empresas.",
      "Dados de bases e páginas oficiais (FDA.gov, NHTSA.gov, CPSC, etc.), atualizados regularmente. Não substitui fontes oficiais.",
      "Traduções podem ser por IA—confirme na fonte oficial. Para um recall específico, use os contatos da empresa ou do aviso oficial.",
      "Contato: contact@recallsatlas.com. Dados de uso e cookies: veja a política de privacidade.",
    ],
  },
  hi: {
    title: "Recalls Atlas के बारे में",
    privacyLabel: "गोपनीयता नीति",
    paragraphs: [
      "Recalls Atlas एक स्वतंत्र साइट है जो अमेरिकी रिकॉल जानकारी सार्वजनिक सरकारी स्रोतों से एकत्र करती है: FDA (खाद्य, दवा, उपकरण, पूरक), NHTSA (वाहन), CPSC (उपभोक्ता उत्पाद)। उद्देश्य: कई भाषाओं में खोज और समझ आसान बनाना।",
      "FDA, NHTSA और CPSC रिकॉल सार्वजनिक सेवा के रूप में प्रकाशित करते हैं और उत्पादों या कंपनियों का समर्थन नहीं करते। Recalls Atlas किसी सरकारी संगठन से जुड़ा नहीं; केवल सार्वजनिक जानकारी सूचनाथमक रूप से प्रस्तुत करता है और किसी उत्पाद या कंपनी का समर्थन नहीं करता।",
      "डेटा आधिकारिक सार्वजनिक डेटाबेस (FDA.gov, NHTSA.gov, CPSC आदि) से नियमित अपडेट। आधिकारिक स्रोतों का विकल्प नहीं।",
      "अनुवाद AI से हो सकते हैं—आधिकारिक स्रोत पर सत्यापित करें। विशिष्ट रिकॉल के लिए जारीकर्ता के संपर्क उपयोग करें।",
      "संपर्क: contact@recallsatlas.com। विश्लेषण व कुकीज़ हेतु गोपनीयता नीति देखें।",
    ],
  },
  ru: {
    title: "О Recalls Atlas",
    privacyLabel: "Политика конфиденциальности",
    paragraphs: [
      "Recalls Atlas — независимый сайт, собирающий данные об отзывах из открытых госисточников США: FDA (продукты, лекарства, изделия, БАД), NHTSA (авто), CPSC (товары широкого потребления). Цель — удобный поиск и понимание на разных языках.",
      "FDA, NHTSA и CPSC публикуют объявления как общественную услугу и не одобряют продукты или компании. Recalls Atlas не связан с госорганами; мы используем открытые данные только для информации и также не одобряем продукты, бренды или компании.",
      "Источники — официальные публичные базы и страницы (FDA.gov, NHTSA.gov, CPSC и др.), обновляются регулярно. Не заменяет официальные источники.",
      "Переводы могут быть ИИ — проверяйте официальный источник. По конкретному отзыву используйте контакты компании или ведомства.",
      "Связь: contact@recallsatlas.com. Аналитика и cookie — см. политику конфиденциальности.",
    ],
  },
  vi: {
    title: "Giới thiệu Recalls Atlas",
    privacyLabel: "Chính sách bảo mật",
    paragraphs: [
      "Recalls Atlas là trang độc lập tổng hợp thông tin thu hồi Hoa Kỳ từ nguồn công khai: FDA (thực phẩm, thuốc, thiết bị, thực phẩm chức năng), NHTSA (xe), CPSC (hàng tiêu dùng). Mục tiêu: tìm kiếm và hiểu rõ hơn bằng nhiều ngôn ngữ.",
      "FDA, NHTSA và CPSC công bố thu hồi như dịch vụ công và không xác nhận ủng hộ sản phẩm hay công ty. Recalls Atlas không liên kết cơ quan nhà nước; chỉ dùng thông tin công khai để tham khảo và cũng không xác nhận ủng hộ sản phẩm hay thương hiệu.",
      "Dữ liệu từ cơ sở dữ liệu chính thức công khai (FDA.gov, NHTSA.gov, CPSC…), cập nhật định kỳ. Không thay thế nguồn chính thức.",
      "Bản dịch có thể do AI—luôn đối chiếu nguồn chính thức. Thu hồi cụ thể: dùng liên hệ của công ty hoặc thông báo cơ quan.",
      "Liên hệ: contact@recallsatlas.com. Phân tích và cookie: xem chính sách bảo mật.",
    ],
  },
};
