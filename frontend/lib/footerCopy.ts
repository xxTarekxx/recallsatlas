import type { SiteUiLang } from "@/lib/siteLocale";

export type FooterCopy = {
  copyright: string;
  disclaimerP1: string;
  disclaimerP2: string;
};

export const FOOTER_COPY: Record<SiteUiLang, FooterCopy> = {
  en: {
    copyright: "Recall data from U.S. government sources, aggregated for public use.",
    disclaimerP1:
      "The FDA, NHTSA, and CPSC post recall announcements as a public service. They do not endorse any recalled product or company. Recalls Atlas aggregates that public information and does not endorse any product, brand, or company.",
    disclaimerP2:
      "Recalls Atlas is independent and not affiliated with any government agency. This site is informational only; AI translations may be imperfect—confirm details on the official source. For a specific recall, use the contact numbers published by the issuing company or on the agency notice, not Recalls Atlas. Recalls Atlas is not liable for decisions based on this site.",
  },
  es: {
    copyright: "Datos de retiros de fuentes gubernamentales de EE. UU., agregados para el público.",
    disclaimerP1:
      "La FDA, la NHTSA y la CPSC publican avisos de retiro como servicio público y no respaldan productos ni empresas. Recalls Atlas agrega esa información pública y tampoco respalda productos, marcas ni empresas.",
    disclaimerP2:
      "Recalls Atlas es independiente y no está afiliado a ninguna agencia. Contenido solo informativo; las traducciones por IA pueden fallar—confirme en la fuente oficial. Para un retiro concreto, use los datos de contacto de la empresa emisora o del aviso oficial, no Recalls Atlas. Sin responsabilidad por decisiones basadas en este sitio.",
  },
  ar: {
    copyright: "بيانات استدعاءات من مصادر حكومية أمريكية، مجمّعة للعموم.",
    disclaimerP1:
      "تنشر FDA وNHTSA وCPSC إعلانات الاستدعاء كخدمة عامة ولا توافق على منتجات أو شركات. يعيد Recalls Atlas نشر تلك المعلومات العلنية ولا يوافق على أي منتج أو علامة أو شركة.",
    disclaimerP2:
      "Recalls Atlas مستقل وغير تابع لأي جهة حكومية. المحتوى للمعلومات فقط؛ قد تكون الترجمات آلية—تحقق من المصدر الرسمي. للاستفسار عن استدعاء معيّن استخدم أرقام الجهة المُصدِرة للإعلان، وليس Recalls Atlas. دون مسؤولية عن القرارات المبنية على هذا الموقع.",
  },
  zh: {
    copyright: "来自美国政府机构、为公众汇总整理的召回数据。",
    disclaimerP1:
      "FDA、NHTSA 与 CPSC 将召回公告作为公共服务发布，不背书任何产品或公司。Recalls Atlas 汇总上述公开信息，亦不背书任何产品、品牌或公司。",
    disclaimerP2:
      "Recalls Atlas 为独立网站，不隶属于任何政府机构。内容仅供参考；AI 译文可能有误—请以官方来源为准。具体召回请使用发布企业或机构公告上的联系方式，而非联系 Recalls Atlas。对因使用本站信息作出的决定，Recalls Atlas 不承担责任。",
  },
  fr: {
    copyright: "Données de rappels issues de sources publiques américaines, agrégées pour le public.",
    disclaimerP1:
      "La FDA, la NHTSA et la CPSC publient les rappels comme service public et n’approuvent aucun produit ni entreprise. Recalls Atlas reprend ces informations publiques et n’approuve aucun produit, marque ou entreprise.",
    disclaimerP2:
      "Recalls Atlas est indépendant et non affilié à une institution publique. Contenu informatif ; traductions IA à vérifier sur la source officielle. Pour un rappel précis, utilisez les coordonnées de l’entreprise ou de l’avis officiel, pas Recalls Atlas. Aucune responsabilité pour les décisions fondées sur ce site.",
  },
  de: {
    copyright: "Rückrufdaten aus US-Behördenquellen, für die Öffentlichkeit zusammengestellt.",
    disclaimerP1:
      "FDA, NHTSA und CPSC veröffentlichen Rückrufbekanntmachungen als öffentlichen Service und befürworten keine Produkte oder Unternehmen. Recalls Atlas bündelt diese öffentlichen Informationen und befürwortet ebenfalls keine Produkte, Marken oder Unternehmen.",
    disclaimerP2:
      "Recalls Atlas ist unabhängig und nicht mit Behörden verbunden. Nur zur Information; KI-Übersetzungen bitte an der Quelle prüfen. Für einen Rückruf: Kontaktdaten des meldenden Unternehmens oder im Behördenhinweis—nicht Recalls Atlas. Keine Haftung für Entscheidungen auf Grundlage dieser Website.",
  },
  ja: {
    copyright: "米国政府ソースから集約したリコール情報（公開用）。",
    disclaimerP1:
      "FDA・NHTSA・CPSC はリコール情報を公共サービスとして公表し、製品や企業を推奨しません。Recalls Atlas はその公開情報を集約するだけで、製品・ブランド・企業を推奨しません。",
    disclaimerP2:
      "Recalls Atlas は独立サイトで政府機関と無関係です。参考情報であり、AI 翻訳は要確認—公式ソースでご確認ください。個別のお問い合わせは発表企業の連絡先（官公庁通知の記載）をご利用ください。本サイトに基づく行動について責任を負いません。",
  },
  pt: {
    copyright: "Dados de recalls de fontes governamentais dos EUA, agregados ao público.",
    disclaimerP1:
      "A FDA, NHTSA e CPSC publicam recalls como serviço público e não endossam produtos nem empresas. Recalls Atlas agrega essa informação pública e também não endossa produtos, marcas ou empresas.",
    disclaimerP2:
      "Recalls Atlas é independente e não é afiliado a órgãos públicos. Conteúdo informativo; confira traduções de IA na fonte oficial. Para um recall específico, use os contatos da empresa ou do aviso oficial, não a Recalls Atlas. Sem responsabilidade por decisões com base neste site.",
  },
  hi: {
    copyright: "अमेरिकी सरकारी स्रोतों से एकत्रित रिकॉल डेटा, सार्वजनिक उपयोग हेतु।",
    disclaimerP1:
      "FDA, NHTSA और CPSC रिकॉल घोषणाएँ सार्वजनिक सेवा के रूप में प्रकाशित करते हैं और उत्पादों या कंपनियों का समर्थन नहीं करते। Recalls Atlas वह सार्वजनिक जानकारी एकत्र करता है और किसी उत्पाद, ब्रांड या कंपनी का समर्थन नहीं करता।",
    disclaimerP2:
      "Recalls Atlas स्वतंत्र है और किसी सरकारी एजेंसी से संबद्ध नहीं। केवल सूचनाथमक; AI अनुवाद आधिकारिक स्रोत पर सत्यापित करें। विशिष्ट रिकॉल के लिए जारीकर्ता कंपनी या आधिकारिक नोटिस के संपर्क उपयोग करें, Recalls Atlas नहीं। इस साइट पर आधारित निर्णयों की कोई जिम्मेदारी नहीं।",
  },
  ru: {
    copyright: "Данные отзывов из госисточников США, собранные для общественности.",
    disclaimerP1:
      "FDA, NHTSA и CPSC публикуют объявления об отзывах как общественную услугу и не одобряют продукты или компании. Recalls Atlas агрегирует эту общедоступную информацию и также не одобряет продукты, бренды или компании.",
    disclaimerP2:
      "Recalls Atlas — независимый сайт, не связан с госорганами. Информация справочная; переводы ИИ проверяйте по официальному источнику. По конкретному отзыву используйте контакты компании или ведомства из объявления, а не Recalls Atlas. Ответственности за решения на основе сайта нет.",
  },
  vi: {
    copyright: "Dữ liệu thu hồi từ nguồn chính phủ Hoa Kỳ, tổng hợp phục vụ công chúng.",
    disclaimerP1:
      "FDA, NHTSA và CPSC công bố thu hồi như dịch vụ công và không xác nhận ủng hộ sản phẩm hay công ty. Recalls Atlas tổng hợp thông tin công khai đó và cũng không xác nhận ủng hộ sản phẩm, thương hiệu hay công ty.",
    disclaimerP2:
      "Recalls Atlas độc lập, không liên kết cơ quan nhà nước. Chỉ mang tính tham khảo; bản dịch AI cần đối chiếu nguồn chính thức. Thu hồi cụ thể: dùng số liên hệ của công ty hoặc thông báo cơ quan, không phải Recalls Atlas. Không chịu trách nhiệm về quyết định dựa trên trang này.",
  },
};
