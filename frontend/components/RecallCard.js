import Link from "next/link";

function formatDate(yyyymmdd) {
  if (!yyyymmdd || typeof yyyymmdd !== "string" || yyyymmdd.length !== 8) {
    return yyyymmdd || "";
  }
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  return `${year}-${month}-${day}`;
}

export default function RecallCard({ recall }) {
  const {
    slug,
    title,
    brand,
    product,
    report_date,
    image,
  } = recall;

  const href = `/recalls/${slug}`;
  const displayTitle = title || `${product || "Unknown product"} Recall`;
  const displayBrand = brand || "Unknown brand";
  const displayDate = formatDate(report_date);

  return (
    <article className="recall-card">
      <Link href={href} className="recall-card-link">
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
              No image
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

