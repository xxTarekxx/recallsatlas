import Link from "next/link";
import { getShortRecallTitle } from "@/lib/recall-utils";

/** Format YYYYMMDD as MM/DD/YYYY */
function formatDate(yyyymmdd) {
  if (!yyyymmdd || typeof yyyymmdd !== "string" || yyyymmdd.length !== 8) {
    return yyyymmdd || "";
  }
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  return `${month}/${day}/${year}`;
}

export default function RecallCard({ recall }) {
  const {
    slug,
    brand,
    product,
    report_date,
    image,
  } = recall;

  const year = report_date && String(report_date).length >= 4 ? String(report_date).slice(0, 4) : "";
  const displayTitle = getShortRecallTitle(product || "Product", year);
  const displayBrand = brand || "Unknown brand";
  const displayDate = formatDate(report_date);

  return (
    <article className="recall-card">
      <Link href={`/recalls/${slug}`} className="recall-card-link">
        <div className="recall-card-image-wrapper">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={displayTitle}
              className="recall-card-image"
              loading="lazy"
            />
          ) : (
            <div className="recall-card-image placeholder-image">
              Image not available
            </div>
          )}
        </div>
        <div className="recall-card-body">
          <h3 className="recall-card-title">{displayTitle}</h3>
          <p className="recall-card-brand">{displayBrand}</p>
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

