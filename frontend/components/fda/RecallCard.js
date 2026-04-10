import Link from "next/link";
import { RECALL_CARD_UI } from "@/lib/recallCardUi";
import { getShortRecallTitle } from "@/lib/recall-utils";
import { isRtlUiLang, withLangPath } from "@/lib/siteLocale";

function formatDate(value) {
  if (!value || typeof value !== "string") return value || "";
  const raw = value.trim();
  const compact = raw.replace(/-/g, "");
  if (compact.length !== 8) return raw;
  const year = compact.slice(0, 4);
  const month = compact.slice(4, 6);
  const day = compact.slice(6, 8);
  return `${month}/${day}/${year}`;
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getActiveLangSlice(recall, uiLang) {
  const languages =
    recall?.languages && typeof recall.languages === "object" ? recall.languages : {};
  return languages[uiLang] || languages.en || {};
}

function getSummary(recall, active, maxLen) {
  const content =
    Array.isArray(active?.content) && active.content.length > 0
      ? active.content
      : Array.isArray(recall?.content)
        ? recall.content
        : [];
  const firstSection = content.find((section) => section?.text);
  const firstText = firstSection?.text;
  const raw = firstText
    ? stripHtml(firstText)
    : active?.reason ||
      recall?.reason ||
      active?.description ||
      recall?.description ||
      active?.productDescription ||
      recall?.productDescription ||
      recall?.product ||
      "";
  if (!raw) return "";
  return raw.length <= maxLen ? raw : `${raw.slice(0, maxLen).trim()}...`;
}

function getFallbackMonogram(product, brand) {
  const source = String(brand || product || "").trim();
  if (!source) return "RA";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function RecallCard({ recall, uiLang = "en" }) {
  const { slug } = recall;
  const labels = RECALL_CARD_UI[uiLang] || RECALL_CARD_UI.en;
  const active = getActiveLangSlice(recall, uiLang);
  const cardDir = isRtlUiLang(uiLang) ? "rtl" : "ltr";

  const image =
    recall?.image && typeof recall.image === "object" ? recall.image.url : recall?.image;
  const hasImage = Boolean(image);

  const brand = active.brandName || recall?.brandName || recall?.brand || "";
  const product =
    active.productDescription ||
    recall?.productDescription ||
    active.title ||
    recall?.title ||
    recall?.product ||
    "";
  const productType = active.productType || recall?.productType || recall?.product_type || "";
  const reportDate = recall?.report_date || recall?.datePublished || "";

  const year = reportDate && String(reportDate).length >= 4 ? String(reportDate).slice(0, 4) : "";
  const displayTitle = getShortRecallTitle(product || "Product", year);
  const displayBrand = brand || labels.unknownBrand;
  const displayDate = formatDate(reportDate);
  const summaryShort = getSummary(recall, active, hasImage ? 200 : 280);
  const isTerminated = recall.terminated === true;
  const statusLabel = isTerminated ? labels.terminated : labels.ongoing;
  const monogram = getFallbackMonogram(product, brand);

  return (
    <article className="recall-card" dir={cardDir} lang={uiLang}>
      <span
        className={`recall-card-status recall-card-status--${isTerminated ? "terminated" : "ongoing"}`}
        aria-label={statusLabel}
      >
        {statusLabel}
      </span>
      <Link href={withLangPath(`/recalls/${slug}`, uiLang)} className="recall-card-link">
        <div
          className={`recall-card-image-wrapper ${
            hasImage ? "" : "recall-card-image-wrapper--fallback"
          }`}
        >
          {hasImage ? (
            <>
              <div className="recall-card-image-overlay" />
              <div className="recall-card-media-copy">
                {productType ? <p className="recall-card-media-kicker">{productType}</p> : null}
                <p className="recall-card-media-title">{displayBrand}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={displayTitle}
                className="recall-card-image"
                loading="lazy"
              />
            </>
          ) : (
            <div className="recall-card-image-placeholder" aria-hidden="true">
              <span className="recall-card-image-placeholder-mark">{monogram}</span>
              {productType ? (
                <span className="recall-card-image-placeholder-label">{productType}</span>
              ) : null}
            </div>
          )}
        </div>
        <div className="recall-card-body">
          {productType ? <p className="recall-card-type">{productType}</p> : null}
          <h3 className="recall-card-title">{displayTitle}</h3>
          <p className="recall-card-brand">{displayBrand}</p>
          {summaryShort ? (
            <p className={`recall-card-summary ${hasImage ? "recall-card-summary--with-image" : ""}`}>
              {summaryShort}
            </p>
          ) : null}
          {displayDate ? (
            <p className="recall-card-date">
              <span>{labels.reported} </span>
              {displayDate}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
