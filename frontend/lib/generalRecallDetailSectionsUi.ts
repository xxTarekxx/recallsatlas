import type { SiteUiLang } from "@/lib/siteLocale";

/** Static section titles on consumer (CPSC) recall detail — not from OpenAI JSON. */
export type GeneralRecallDetailSectionsUi = {
  products: string;
  images: string;
  hazards: string;
  remedy: string;
  soldAt: string;
  consumerContact: string;
  /** When product name missing in data */
  productFallback: string;
  /** Shown before model number, e.g. "Model: " */
  modelPrefix: string;
};

export const GENERAL_RECALL_DETAIL_SECTIONS_UI: Record<SiteUiLang, GeneralRecallDetailSectionsUi> = {
  en: {
    products: "Products",
    images: "Images",
    hazards: "Hazards",
    remedy: "Remedy",
    soldAt: "Sold at",
    consumerContact: "Consumer contact",
    productFallback: "Product",
    modelPrefix: "Model: ",
  },
  es: {
    products: "Productos",
    images: "Imágenes",
    hazards: "Riesgos",
    remedy: "Medida correctiva",
    soldAt: "Puntos de venta",
    consumerContact: "Contacto para consumidores",
    productFallback: "Producto",
    modelPrefix: "Modelo: ",
  },
  ar: {
    products: "المنتجات",
    images: "الصور",
    hazards: "المخاطر",
    remedy: "الإجراء المطلوب",
    soldAt: "أماكن البيع",
    consumerContact: "جهة اتصال المستهلك",
    productFallback: "المنتج",
    modelPrefix: "الطراز: ",
  },
  zh: {
    products: "产品",
    images: "图片",
    hazards: "危害",
    remedy: "补救措施",
    soldAt: "销售地点",
    consumerContact: "消费者联系方式",
    productFallback: "产品",
    modelPrefix: "型号：",
  },
  fr: {
    products: "Produits",
    images: "Images",
    hazards: "Dangers",
    remedy: "Mesure corrective",
    soldAt: "Points de vente",
    consumerContact: "Contact consommateur",
    productFallback: "Produit",
    modelPrefix: "Modèle : ",
  },
  de: {
    products: "Produkte",
    images: "Bilder",
    hazards: "Gefahren",
    remedy: "Abhilfe",
    soldAt: "Verkaufsorte",
    consumerContact: "Verbraucherkontakt",
    productFallback: "Produkt",
    modelPrefix: "Modell: ",
  },
  ja: {
    products: "製品",
    images: "画像",
    hazards: "危険性",
    remedy: "対応方法",
    soldAt: "販売店",
    consumerContact: "お問い合わせ先",
    productFallback: "製品",
    modelPrefix: "型番：",
  },
  pt: {
    products: "Produtos",
    images: "Imagens",
    hazards: "Riscos",
    remedy: "Medida corretiva",
    soldAt: "Onde foi vendido",
    consumerContact: "Contato do consumidor",
    productFallback: "Produto",
    modelPrefix: "Modelo: ",
  },
  hi: {
    products: "उत्पाद",
    images: "छवियाँ",
    hazards: "खतरे",
    remedy: "उपाय",
    soldAt: "बिक्री स्थान",
    consumerContact: "उपभोक्ता संपर्क",
    productFallback: "उत्पाद",
    modelPrefix: "मॉडल: ",
  },
  ru: {
    products: "Продукция",
    images: "Изображения",
    hazards: "Опасности",
    remedy: "Меры по устранению",
    soldAt: "Где продавалось",
    consumerContact: "Контакты для потребителей",
    productFallback: "Продукт",
    modelPrefix: "Модель: ",
  },
  vi: {
    products: "Sản phẩm",
    images: "Hình ảnh",
    hazards: "Nguy cơ",
    remedy: "Biện pháp khắc phục",
    soldAt: "Nơi bán",
    consumerContact: "Liên hệ người tiêu dùng",
    productFallback: "Sản phẩm",
    modelPrefix: "Mẫu: ",
  },
};
