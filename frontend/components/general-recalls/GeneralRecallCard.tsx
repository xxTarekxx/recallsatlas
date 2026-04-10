import Link from "next/link";
import GeneralRecallCategoryTag from "@/components/general-recalls/GeneralRecallCategoryTag";
import { RECALL_CARD_UI } from "@/lib/recallCardUi";
import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";
import { getShortRecallTitle } from "@/lib/recall-utils";
import { isRtlUiLang, withLangPath, type SiteUiLang } from "@/lib/siteLocale";

function formatRecallDate(value: string): string {
  if (!value || typeof value !== "string") return "";
  const raw = value.trim();
  const compact = raw.replace(/-/g, "");
  if (compact.length >= 8 && /^\d{8}/.test(compact)) {
    const y = compact.slice(0, 4);
    const m = compact.slice(4, 6);
    const d = compact.slice(6, 8);
    return `${m}/${d}/${y}`;
  }
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    const y = dt.getFullYear();
    return `${m}/${d}/${y}`;
  }
  return raw;
}

function getFallbackMonogram(title: string, brand: string): string {
  const source = String(brand || title || "").trim();
  if (!source) return "RA";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

type Props = {
  item: GeneralRecallListItem;
  uiLang: SiteUiLang;
};

export default function GeneralRecallCard({ item, uiLang = "en" }: Props) {
  const labels = RECALL_CARD_UI[uiLang] || RECALL_CARD_UI.en;
  const cardDir = isRtlUiLang(uiLang) ? "rtl" : "ltr";
  const hasImage = Boolean(item.imageUrl);
  const year =
    item.recallDate && String(item.recallDate).length >= 4
      ? String(item.recallDate).slice(0, 4)
      : "";
  const displayTitle = getShortRecallTitle(item.title || "Product", year);
  const displayBrand = item.brand || labels.unknownBrand;
  const displayDate = formatRecallDate(item.recallDate);
  const summaryShort =
    item.summary.length > (hasImage ? 200 : 280)
      ? `${item.summary.slice(0, hasImage ? 200 : 280).trim()}...`
      : item.summary;
  const monogram = getFallbackMonogram(item.title, item.brand);

  return (
    <article className="recall-card" dir={cardDir} lang={uiLang}>
      {item.categoryKey ? (
        <GeneralRecallCategoryTag
          categoryKey={item.categoryKey}
          className="recall-card-category-tag"
        />
      ) : null}
      <span
        className="recall-card-status recall-card-status--ongoing"
        aria-label={labels.consumerProduct}
      >
        {labels.consumerProduct}
      </span>
      <Link
        href={withLangPath(`/general-recalls/${encodeURIComponent(item.slug)}`, uiLang)}
        className="recall-card-link"
      >
        <div
          className={`recall-card-image-wrapper ${
            hasImage ? "" : "recall-card-image-wrapper--fallback"
          }`}
        >
          {hasImage ? (
            <>
              <div className="recall-card-image-overlay" />
              <div className="recall-card-media-copy">
                {item.productType ? (
                  <p className="recall-card-media-kicker">{item.productType}</p>
                ) : null}
                <p className="recall-card-media-title">{displayBrand}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl as string}
                alt={displayTitle}
                className="recall-card-image"
                loading="lazy"
              />
            </>
          ) : (
            <div className="recall-card-image-placeholder" aria-hidden="true">
              <span className="recall-card-image-placeholder-mark">{monogram}</span>
              {item.productType ? (
                <span className="recall-card-image-placeholder-label">{item.productType}</span>
              ) : null}
            </div>
          )}
        </div>
        <div className="recall-card-body">
          {item.productType ? <p className="recall-card-type">{item.productType}</p> : null}
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
