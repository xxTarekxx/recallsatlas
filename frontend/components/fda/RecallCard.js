import Link from "next/link";
import { RECALL_CARD_UI } from "@/lib/recallCardUi";
import { getShortRecallTitle } from "@/lib/recall-utils";
import { isRtlUiLang, withLangPath } from "@/lib/siteLocale";

/** Format YYYYMMDD or YYYY-MM-DD as MM/DD/YYYY */
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

/** Strip HTML tags and normalize whitespace. */
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Resolve `recall.languages[code]` with fallback to English (same as detail page). */
function getActiveLangSlice(recall, uiLang) {
  const languages =
    recall?.languages && typeof recall.languages === "object" ? recall.languages : {};
  return languages[uiLang] || languages.en || {};
}

/** Summary line from translated or English content / reason. */
function getSummary(recall, active, maxLen) {
  const content =
    Array.isArray(active?.content) && active.content.length > 0
      ? active.content
      : Array.isArray(recall?.content)
        ? recall.content
        : [];
  const firstSection = content.find((s) => s?.text);
  const firstText = firstSection?.text;
  const raw = firstText
    ? stripHtml(firstText)
    : active?.reason ||
      recall?.reason ||
      active?.productDescription ||
      recall?.productDescription ||
      recall?.product ||
      "";
  if (!raw) return "";
  return raw.length <= maxLen ? raw : raw.slice(0, maxLen).trim() + "…";
}

export default function RecallCard({ recall, uiLang = "en" }) {
  const { slug } = recall;
  const labels = RECALL_CARD_UI[uiLang] || RECALL_CARD_UI.en;
  const active = getActiveLangSlice(recall, uiLang);
  const cardDir = isRtlUiLang(uiLang) ? "rtl" : "ltr";

  const image = recall?.image && typeof recall.image === "object" ? recall.image.url : recall?.image;
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

  return (
    <article className="recall-card" dir={cardDir} lang={uiLang}>
      <span
        className={`recall-card-status recall-card-status--${isTerminated ? "terminated" : "ongoing"}`}
        aria-label={statusLabel}
      >
        {statusLabel}
      </span>
      <Link
        href={withLangPath(`/recalls/${slug}`, uiLang)}
        className="recall-card-link"
      >
        {hasImage && (
          <div className="recall-card-image-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={displayTitle}
              className="recall-card-image"
              loading="lazy"
            />
          </div>
        )}
        <div className="recall-card-body">
          {productType && (
            <p className="recall-card-type">{productType}</p>
          )}
          <h3 className="recall-card-title">{displayTitle}</h3>
          <p className="recall-card-brand">{displayBrand}</p>
          {summaryShort && (
            <p className={`recall-card-summary ${hasImage ? "recall-card-summary--with-image" : ""}`}>
              {summaryShort}
            </p>
          )}
          {displayDate && (
            <p className="recall-card-date">
              <span>{labels.reported} </span>
              {displayDate}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
