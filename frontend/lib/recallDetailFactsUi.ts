/**
 * Chrome labels for FDA recall detail facts sidebar (`recall-detail-facts`).
 * Keys match Mongo `recalls.languages` / FDA JSON language codes (`hi` = Hindi).
 */

export type RecallDetailFactsUi = {
  recallDetailsTitle: string;
  status: string;
  terminated: string;
  ongoing: string;
  product: string;
  productType: string;
  brand: string;
  company: string;
  recallDate: string;
  classification: string;
  distribution: string;
  reasonForRecall: string;
};

const en: RecallDetailFactsUi = {
  recallDetailsTitle: "Recall details",
  status: "Status",
  terminated: "Terminated",
  ongoing: "Ongoing",
  product: "Product",
  productType: "Product type",
  brand: "Brand",
  company: "Company",
  recallDate: "Recall date",
  classification: "Classification",
  distribution: "Distribution",
  reasonForRecall: "Reason for recall",
};

const es: RecallDetailFactsUi = {
  recallDetailsTitle: "Detalles del retiro",
  status: "Estado",
  terminated: "Finalizado",
  ongoing: "En curso",
  product: "Producto",
  productType: "Tipo de producto",
  brand: "Marca",
  company: "Empresa",
  recallDate: "Fecha del retiro",
  classification: "Clasificación",
  distribution: "Distribución",
  reasonForRecall: "Motivo del retiro",
};

const de: RecallDetailFactsUi = {
  recallDetailsTitle: "Rückrufdetails",
  status: "Status",
  terminated: "Abgeschlossen",
  ongoing: "Laufend",
  product: "Produkt",
  productType: "Produkttyp",
  brand: "Marke",
  company: "Unternehmen",
  recallDate: "Rückrufdatum",
  classification: "Einstufung",
  distribution: "Vertrieb",
  reasonForRecall: "Grund für den Rückruf",
};

const ja: RecallDetailFactsUi = {
  recallDetailsTitle: "リコールの詳細",
  status: "状況",
  terminated: "終了",
  ongoing: "継続中",
  product: "製品",
  productType: "製品タイプ",
  brand: "ブランド",
  company: "企業",
  recallDate: "リコール日",
  classification: "分類",
  distribution: "流通",
  reasonForRecall: "リコールの理由",
};

const fr: RecallDetailFactsUi = {
  recallDetailsTitle: "Détails du rappel",
  status: "Statut",
  terminated: "Terminé",
  ongoing: "En cours",
  product: "Produit",
  productType: "Type de produit",
  brand: "Marque",
  company: "Entreprise",
  recallDate: "Date du rappel",
  classification: "Classification",
  distribution: "Distribution",
  reasonForRecall: "Motif du rappel",
};

const pt: RecallDetailFactsUi = {
  recallDetailsTitle: "Detalhes do recall",
  status: "Status",
  terminated: "Encerrado",
  ongoing: "Em andamento",
  product: "Produto",
  productType: "Tipo de produto",
  brand: "Marca",
  company: "Empresa",
  recallDate: "Data do recall",
  classification: "Classificação",
  distribution: "Distribuição",
  reasonForRecall: "Motivo do recall",
};

const ru: RecallDetailFactsUi = {
  recallDetailsTitle: "Сведения об отзыве",
  status: "Статус",
  terminated: "Завершён",
  ongoing: "Действует",
  product: "Продукт",
  productType: "Тип продукта",
  brand: "Бренд",
  company: "Компания",
  recallDate: "Дата отзыва",
  classification: "Классификация",
  distribution: "Распространение",
  reasonForRecall: "Причина отзыва",
};

const it: RecallDetailFactsUi = {
  recallDetailsTitle: "Dettagli del richiamo",
  status: "Stato",
  terminated: "Concluso",
  ongoing: "In corso",
  product: "Prodotto",
  productType: "Tipo di prodotto",
  brand: "Marchio",
  company: "Azienda",
  recallDate: "Data del richiamo",
  classification: "Classificazione",
  distribution: "Distribuzione",
  reasonForRecall: "Motivo del richiamo",
};

const nl: RecallDetailFactsUi = {
  recallDetailsTitle: "Terugroepdetails",
  status: "Status",
  terminated: "Afgerond",
  ongoing: "Lopend",
  product: "Product",
  productType: "Producttype",
  brand: "Merk",
  company: "Bedrijf",
  recallDate: "Terugroepdatum",
  classification: "Classificatie",
  distribution: "Distributie",
  reasonForRecall: "Reden voor terugroeping",
};

const pl: RecallDetailFactsUi = {
  recallDetailsTitle: "Szczegóły wycofania",
  status: "Status",
  terminated: "Zakończone",
  ongoing: "W toku",
  product: "Produkt",
  productType: "Rodzaj produktu",
  brand: "Marka",
  company: "Firma",
  recallDate: "Data wycofania",
  classification: "Klasyfikacja",
  distribution: "Dystrybucja",
  reasonForRecall: "Powód wycofania",
};

const tr: RecallDetailFactsUi = {
  recallDetailsTitle: "Geri çağırma ayrıntıları",
  status: "Durum",
  terminated: "Sonlandırıldı",
  ongoing: "Devam ediyor",
  product: "Ürün",
  productType: "Ürün türü",
  brand: "Marka",
  company: "Şirket",
  recallDate: "Geri çağırma tarihi",
  classification: "Sınıflandırma",
  distribution: "Dağıtım",
  reasonForRecall: "Geri çağırma nedeni",
};

const fa: RecallDetailFactsUi = {
  recallDetailsTitle: "جزئیات فراخوان",
  status: "وضعیت",
  terminated: "پایان‌یافته",
  ongoing: "جاری",
  product: "محصول",
  productType: "نوع محصول",
  brand: "برند",
  company: "شرکت",
  recallDate: "تاریخ فراخوان",
  classification: "طبقه‌بندی",
  distribution: "توزیع",
  reasonForRecall: "دلیل فراخوان",
};

const zh: RecallDetailFactsUi = {
  recallDetailsTitle: "召回详情",
  status: "状态",
  terminated: "已终止",
  ongoing: "进行中",
  product: "产品",
  productType: "产品类型",
  brand: "品牌",
  company: "公司",
  recallDate: "召回日期",
  classification: "分类",
  distribution: "分销",
  reasonForRecall: "召回原因",
};

const vi: RecallDetailFactsUi = {
  recallDetailsTitle: "Chi tiết thu hồi",
  status: "Trạng thái",
  terminated: "Đã kết thúc",
  ongoing: "Đang hiệu lực",
  product: "Sản phẩm",
  productType: "Loại sản phẩm",
  brand: "Thương hiệu",
  company: "Công ty",
  recallDate: "Ngày thu hồi",
  classification: "Phân loại",
  distribution: "Phân phối",
  reasonForRecall: "Lý do thu hồi",
};

const id: RecallDetailFactsUi = {
  recallDetailsTitle: "Detail penarikan",
  status: "Status",
  terminated: "Diakhiri",
  ongoing: "Berlangsung",
  product: "Produk",
  productType: "Jenis produk",
  brand: "Merek",
  company: "Perusahaan",
  recallDate: "Tanggal penarikan",
  classification: "Klasifikasi",
  distribution: "Distribusi",
  reasonForRecall: "Alasan penarikan",
};

const cs: RecallDetailFactsUi = {
  recallDetailsTitle: "Podrobnosti stažení",
  status: "Stav",
  terminated: "Ukončeno",
  ongoing: "Probíhá",
  product: "Výrobek",
  productType: "Typ výrobku",
  brand: "Značka",
  company: "Společnost",
  recallDate: "Datum stažení",
  classification: "Klasifikace",
  distribution: "Distribuce",
  reasonForRecall: "Důvod stažení",
};

const ko: RecallDetailFactsUi = {
  recallDetailsTitle: "리콜 상세",
  status: "상태",
  terminated: "종료",
  ongoing: "진행 중",
  product: "제품",
  productType: "제품 유형",
  brand: "브랜드",
  company: "회사",
  recallDate: "리콜 일자",
  classification: "분류",
  distribution: "유통",
  reasonForRecall: "리콜 사유",
};

const uk: RecallDetailFactsUi = {
  recallDetailsTitle: "Деталі відкликання",
  status: "Статус",
  terminated: "Завершено",
  ongoing: "Триває",
  product: "Продукт",
  productType: "Тип продукту",
  brand: "Бренд",
  company: "Компанія",
  recallDate: "Дата відкликання",
  classification: "Класифікація",
  distribution: "Розповсюдження",
  reasonForRecall: "Причина відкликання",
};

const hu: RecallDetailFactsUi = {
  recallDetailsTitle: "Visszahívás részletei",
  status: "Állapot",
  terminated: "Lezárva",
  ongoing: "Folyamatban",
  product: "Termék",
  productType: "Terméktípus",
  brand: "Márka",
  company: "Vállalat",
  recallDate: "Visszahívás dátuma",
  classification: "Osztályozás",
  distribution: "Forgalmazás",
  reasonForRecall: "A visszahívás oka",
};

const hi: RecallDetailFactsUi = {
  recallDetailsTitle: "रिकॉल विवरण",
  status: "स्थिति",
  terminated: "समाप्त",
  ongoing: "जारी",
  product: "उत्पाद",
  productType: "उत्पाद प्रकार",
  brand: "ब्रांड",
  company: "कंपनी",
  recallDate: "रिकॉल तिथि",
  classification: "वर्गीकरण",
  distribution: "वितरण",
  reasonForRecall: "रिकॉल का कारण",
};

const ar: RecallDetailFactsUi = {
  recallDetailsTitle: "تفاصيل الاستدعاء",
  status: "الحالة",
  terminated: "منتهٍ",
  ongoing: "قيد التنفيذ",
  product: "المنتج",
  productType: "نوع المنتج",
  brand: "العلامة التجارية",
  company: "الشركة",
  recallDate: "تاريخ الاستدعاء",
  classification: "التصنيف",
  distribution: "التوزيع",
  reasonForRecall: "سبب الاستدعاء",
};

const BY_CODE: Record<string, RecallDetailFactsUi> = {
  en,
  es,
  de,
  ja,
  fr,
  pt,
  ru,
  it,
  nl,
  pl,
  tr,
  fa,
  zh,
  vi,
  id,
  cs,
  ko,
  uk,
  hu,
  hi,
  ar,
};

export function getRecallDetailFactsUi(lang: string): RecallDetailFactsUi {
  const key = String(lang || "en").toLowerCase();
  return BY_CODE[key] ?? en;
}
