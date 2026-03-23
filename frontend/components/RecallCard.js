import Link from "next/link";
import { getShortRecallTitle } from "@/lib/recall-utils";

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

/** Get summary from recall: first content section text, or reason/product fallback. */
function getSummary(recall, maxLen) {
  const content = Array.isArray(recall?.content) ? recall.content : [];
  const firstSection = content.find((s) => s?.text);
  const firstText = firstSection?.text;
  const raw = firstText
    ? stripHtml(firstText)
    : recall?.reason || recall?.productDescription || recall?.product || "";
  if (!raw) return "";
  return raw.length <= maxLen ? raw : raw.slice(0, maxLen).trim() + "…";
}

export default function RecallCard({ recall }) {
  const { slug } = recall;
  const image = recall?.image && typeof recall.image === "object" ? recall.image.url : recall?.image;
  const hasImage = Boolean(image);

  const brand = recall?.brandName || recall?.brand || "";
  const product = recall?.productDescription || recall?.product || "";
  const productType = recall?.productType || recall?.product_type || "";
  const reportDate = recall?.report_date || recall?.datePublished || "";

  const year = reportDate && String(reportDate).length >= 4 ? String(reportDate).slice(0, 4) : "";
  const displayTitle = getShortRecallTitle(product || "Product", year);
  const displayBrand = brand || "Unknown brand";
  const displayDate = formatDate(reportDate);
  const summaryShort = getSummary(recall, hasImage ? 200 : 280);
  const isTerminated = recall.terminated === true;

  return (
    <article className="recall-card">
      <span
        className={`recall-card-status recall-card-status--${isTerminated ? "terminated" : "ongoing"}`}
        aria-label={isTerminated ? "Terminated" : "Ongoing"}
      >
        {isTerminated ? "Terminated" : "Ongoing"}
      </span>
      <Link href={`/recalls/${slug}`} className="recall-card-link">
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
              <span>Reported: </span>
              {displayDate}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

