import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { getShortProductName, getShortRecallTitle } from "@/lib/recall-utils";

interface PageProps {
  params: { slug: string };
}

/** Format YYYYMMDD as MM/DD/YYYY */
function formatDate(yyyymmdd?: string) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  return `${month}/${day}/${year}`;
}

export async function generateMetadata({ params }: PageProps) {
  const db = await getDb();
  const recall = await db.collection("recalls").findOne({ slug: params.slug });

  if (!recall) {
    return {
      title: "Recall not found – RecallsAtlas",
    };
  }

  const product = recall.product || "Product";
  const brand = recall.brand || "Unknown brand";
  const year =
    typeof recall.report_date === "string"
      ? recall.report_date.slice(0, 4)
      : "";
  const shortProduct = getShortProductName(product);

  const title = `${shortProduct} Recall (${year}) – FDA Safety Alert`;
  const description = `FDA recall alert for ${shortProduct} manufactured by ${brand}. See reason, risk and affected batches.`;

  const canonical = `https://recallsatlas.com/recalls/${params.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
  };
}

export default async function RecallDetailPage({ params }: PageProps) {
  let recall: any | null = null;
  let dbError: string | null = null;

  try {
    const db = await getDb();
    recall = await db.collection("recalls").findOne({ slug: params.slug });
  } catch (err: any) {
    console.error("Error loading recall detail:", err);
    dbError = "Unable to load this recall at the moment.";
  }

  if (!recall && !dbError) {
    notFound();
  }

  const product = recall?.product || "";
  const year =
    typeof recall?.report_date === "string"
      ? recall.report_date.slice(0, 4)
      : "";
  const shortTitle = getShortRecallTitle(product, year);
  const image = recall?.image;
  const brand = recall?.brand || "";
  const reason = recall?.reason || "";
  const reportDate = formatDate(recall?.report_date);
  const classification = recall?.classification || "";
  const distribution = recall?.distribution || "";
  const sourceUrl = recall?.source_url || "";
  const isGenericFdaUrl =
    sourceUrl === "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts" ||
    sourceUrl.startsWith("https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts");

  return (
    <div className="recall-detail-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>
      <main className="main-content recall-detail">
        <h1>{shortTitle}</h1>
        <p className="recall-detail-subtitle">FDA Safety Alert</p>

        {dbError && <p className="error-message">{dbError}</p>}

        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={shortTitle}
            className="recall-detail-image"
          />
        ) : (
          <div className="recall-detail-placeholder" aria-hidden="true">
            Image not available
          </div>
        )}

        <div className="recall-fields">
          {product && (
            <p className="recall-field-product">
              <strong>Product:</strong> <span className="recall-product-full">{product}</span>
            </p>
          )}
          {brand && (
            <p>
              <strong>Brand:</strong> {brand}
            </p>
          )}
          {reportDate && (
            <p>
              <strong>Recall Date:</strong> {reportDate}
            </p>
          )}
          {classification && (
            <p>
              <strong>Classification:</strong> {classification}
            </p>
          )}
          {distribution && (
            <p>
              <strong>Distribution:</strong> {distribution}
            </p>
          )}
          {reason && (
            <p>
              <strong>Reason:</strong> {reason}
            </p>
          )}
          {sourceUrl && (
            <p>
              <strong>FDA Source:</strong>{" "}
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                {isGenericFdaUrl
                  ? "Browse FDA recalls and safety alerts"
                  : "View official FDA notice"}
              </a>
              {isGenericFdaUrl && (
                <span className="recall-source-note">
                  {" "}(FDA’s API does not provide a direct link to this recall’s page.)
                </span>
              )}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
