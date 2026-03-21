import Link from "next/link";
import { getShortRecallTitle } from "@/lib/recall-utils";
import RecallDetailImageSlider from "./RecallDetailImageSlider";

/** Format YYYYMMDD as MM/DD/YYYY */
function formatDate(yyyymmdd?: string) {
  if (!yyyymmdd || typeof yyyymmdd !== "string" || yyyymmdd.length !== 8) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${m}/${d}/${y}`;
}

function hasHtml(text: string) {
  return /<(?:\w+|table|ul|ol|li|p|a\s)/i.test(text || "");
}

function hasWhatWasRecalledFacts(section: any) {
  const f = section?.facts;
  return (
    section?.subtitle === "What Was Recalled" &&
    f &&
    typeof f === "object" &&
    !!(f.company || f.brand || f.product || f.productType)
  );
}

export interface RecallDetailProps {
  recall: any;
  dbError?: string | null;
}

/**
 * Renders a single recall detail view. Works for any recall from MongoDB
 * (with or without content[]). Use on /recalls/[slug].
 */
export default function RecallDetail({ recall, dbError = null }: RecallDetailProps) {
  if (!recall && !dbError) return null;

  const product = recall?.product || "";
  const year =
    typeof recall?.report_date === "string" ? recall.report_date.slice(0, 4) : "";
  const shortTitle = getShortRecallTitle(product, year);
  const fullTitle = recall?.title || shortTitle;
  const singleImage = typeof recall?.image === "object" ? recall?.image?.url : recall?.image;
  const imagesArray = Array.isArray(recall?.images) ? recall.images : [];
  const imageUrls = imagesArray.length > 0 ? imagesArray : (singleImage ? [singleImage] : []);
  const hasImages = imageUrls.length > 0;
  const brand = recall?.brand || "";
  const reason = recall?.reason || "";
  const reportDate = formatDate(recall?.report_date);
  const classification = recall?.classification || "";
  const distribution = recall?.distribution || "";
  const productType = recall?.product_type || "";
  const sourceUrl = recall?.source_url || "";
  const rawContent = Array.isArray(recall?.content) ? recall.content : [];
  const officialSourceSection = rawContent.find(
    (s: any) => (s?.subtitle || "").toLowerCase().includes("official source")
  );
  const content = rawContent.filter(
    (s: any) => !(s?.subtitle || "").toLowerCase().includes("official source")
  );
  const disclaimer = recall?.disclaimer || "";

  return (
    <div className="recall-detail-page">
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-title">
            RecallsAtlas
          </Link>
          <Link href="/recalls" className="site-header-back">
            ← All recalls
          </Link>
        </div>
      </header>

      <main className="main-content recall-detail-main">
        {dbError && (
          <div className="recall-detail-error" role="alert">
            {dbError}
          </div>
        )}

        <article className="recall-detail-article">
          <div className="recall-detail-hero">
            <p className="recall-detail-badge">FDA Safety Alert</p>
            <h1 className="recall-detail-title">{fullTitle}</h1>
            {disclaimer && (
              <p className="recall-detail-disclaimer">{disclaimer}</p>
            )}
          </div>

          {hasImages && (
            <RecallDetailImageSlider imageUrls={imageUrls} alt={shortTitle} />
          )}

          <section className="recall-detail-facts" aria-label="Recall at a glance">
            <h2 className="recall-detail-facts-title">At a glance</h2>
            <dl className="recall-detail-dl">
              {product && (
                <>
                  <dt className="recall-fact-label recall-fact-label--product">Product</dt>
                  <dd className="recall-fact-value recall-fact-value--product">{product}</dd>
                </>
              )}
              {productType && (
                <>
                  <dt>Product type</dt>
                  <dd>{productType}</dd>
                </>
              )}
              {brand && (
                <>
                  <dt>Brand</dt>
                  <dd>{brand}</dd>
                </>
              )}
              {reportDate && (
                <>
                  <dt>Recall date</dt>
                  <dd>{reportDate}</dd>
                </>
              )}
              {classification && (
                <>
                  <dt>Classification</dt>
                  <dd>{classification}</dd>
                </>
              )}
              {distribution && (
                <>
                  <dt>Distribution</dt>
                  <dd>{distribution}</dd>
                </>
              )}
              {reason && (
                <>
                  <dt>Reason</dt>
                  <dd>{reason}</dd>
                </>
              )}
            </dl>
          </section>

          {content.length > 0 && (
            <div className="recall-detail-content">
              {content.map((section: any, i: number) => (
                <section key={i} className="recall-detail-section">
                  <h2 className="recall-detail-section-title">{section.subtitle}</h2>
                  {hasWhatWasRecalledFacts(section) ? (
                    <dl className="recall-detail-dl recall-what-was-recalled-facts">
                      {section.facts.company ? (
                        <>
                          <dt>Company</dt>
                          <dd>{section.facts.company}</dd>
                        </>
                      ) : null}
                      {section.facts.brand ? (
                        <>
                          <dt>Brand</dt>
                          <dd>{section.facts.brand}</dd>
                        </>
                      ) : null}
                      {section.facts.product ? (
                        <>
                          <dt>Product</dt>
                          <dd>{section.facts.product}</dd>
                        </>
                      ) : null}
                      {section.facts.productType ? (
                        <>
                          <dt>Product type</dt>
                          <dd>{section.facts.productType}</dd>
                        </>
                      ) : null}
                    </dl>
                  ) : null}
                  {section.text && !hasWhatWasRecalledFacts(section) &&
                    (hasHtml(section.text) ? (
                      <div
                        className="recall-content-html recall-detail-section-body"
                        dangerouslySetInnerHTML={{ __html: section.text }}
                      />
                    ) : (
                      <div className="recall-detail-section-body">
                        <p>{section.text}</p>
                      </div>
                    ))}
                  {section.authorityLinks && section.authorityLinks.length > 0 && (
                    <div
                      className="recall-detail-authority-links"
                      dangerouslySetInnerHTML={{
                        __html: section.authorityLinks.join(" "),
                      }}
                    />
                  )}
                </section>
              ))}
            </div>
          )}

          {(sourceUrl || officialSourceSection) && (
            <footer className="recall-detail-footer">
              <h2 className="recall-detail-facts-title">Official Source</h2>
              {officialSourceSection?.text && (
                <p className="recall-detail-footer-publish">
                  {officialSourceSection.text}
                </p>
              )}
              {officialSourceSection?.authorityLinks?.length > 0 && (
                <div
                  className="recall-detail-authority-links"
                  dangerouslySetInnerHTML={{
                    __html: officialSourceSection.authorityLinks.join(" "),
                  }}
                />
              )}
              {sourceUrl && (
                <p className="recall-detail-footer-url">
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    {sourceUrl}
                  </a>
                </p>
              )}
            </footer>
          )}
        </article>
      </main>
    </div>
  );
}
