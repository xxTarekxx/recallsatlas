import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";

interface PageProps {
  params: { slug: string };
}

function formatDate(yyyymmdd?: string) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  return `${year}-${month}-${day}`;
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

  const title = `${product} Recall (${year}) – FDA Safety Alert`;
  const description = `FDA recall alert for ${product} manufactured by ${brand}. See reason, risk and affected batches.`;

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

  const title = recall?.title || "Recall detail";
  const image = recall?.image;
  const product = recall?.product || "";
  const brand = recall?.brand || "";
  const reason = recall?.reason || "";
  const reportDate = formatDate(recall?.report_date);
  const classification = recall?.classification || "";
  const distribution = recall?.distribution || "";
  const sourceUrl = recall?.source_url || "";

  return (
    <div className="recall-detail-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>
      <main className="main-content recall-detail">
        <h1>{title}</h1>

        {dbError && <p className="error-message">{dbError}</p>}

        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="recall-detail-image"
          />
        )}

        <div className="recall-fields">
          {product && (
            <p>
              <strong>Product:</strong> {product}
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
                View official FDA notice
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
