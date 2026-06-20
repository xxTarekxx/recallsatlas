import { notFound } from "next/navigation";
import type { Metadata } from "next";
import RelatedRecalls from "@/components/recallgraph/RelatedRecalls";
import {
  getRecallGraphHealth,
  getRecallGraphRecallBySlug,
  getRecallGraphRelated,
} from "@/lib/recallgraph/server/data";

type PageProps = {
  params: Promise<{ slug: string }>;
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recall = await getRecallGraphRecallBySlug(slug);
  return {
    title: recall ? `${recall.title} | RecallGraph` : "Recall not found | RecallGraph",
    description:
      recall?.description ||
      "RecallGraph source-backed recall detail with related recall graph context and public safety data metadata.",
  };
}

export default async function RecallGraphDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const recall = await getRecallGraphRecallBySlug(slug);
  if (!recall) notFound();
  const [related, health] = await Promise.all([getRecallGraphRelated(recall.id), getRecallGraphHealth()]);
  const embeddingCoverage = health.embeddingCount > 0 ? "available in configured database" : "not available in this runtime";

  return (
    <div className="recallgraph-page">
      <article className="recallgraph-detail">
        <div className="recallgraph-result-meta">
          <span>{recall.source.toUpperCase()}</span>
          <span>{formatDate(recall.recallDate || recall.publishedAt)}</span>
          <span>{recall.category || "uncategorized"}</span>
        </div>
        <h1>{recall.title}</h1>
        <p className="recallgraph-lede">{recall.description}</p>
        <div className="recallgraph-source-box recallgraph-source-box--inline">
          <span className="recallgraph-eyebrow">Source-backed facts</span>
          <p>
            This page separates source-backed recall facts from AI ranking and related-recall
            discovery. Always verify action details with the original source.
          </p>
        </div>
        <dl className="recallgraph-detail-facts">
          <div>
            <dt>Company</dt>
            <dd>{recall.companyName || "Unknown"}</dd>
          </div>
          <div>
            <dt>Brand</dt>
            <dd>{recall.brandName || "Not specified"}</dd>
          </div>
          <div>
            <dt>Product</dt>
            <dd>{recall.productName || recall.productDescription || "Not specified"}</dd>
          </div>
          <div>
            <dt>Product / category</dt>
            <dd>{recall.productType || recall.category || "Not specified"}</dd>
          </div>
          <div>
            <dt>Hazard or reason</dt>
            <dd>{recall.hazards.length ? recall.hazards.join("; ") : "Not specified"}</dd>
          </div>
          <div>
            <dt>Remedy or consumer action</dt>
            <dd>{recall.consumerAction || recall.remedy || "See the official source."}</dd>
          </div>
        </dl>
        {recall.images.length ? (
          <div className="recallgraph-image-grid">
            {recall.images.slice(0, 4).map((image) => (
              <img key={image.url} src={image.url} alt={image.alt || recall.title} />
            ))}
          </div>
        ) : null}
        <div className="recallgraph-source-box">
          <h2>Official source</h2>
          {recall.sourceUrl ? <a href={recall.sourceUrl}>{recall.sourceUrl}</a> : <p>No source URL recorded.</p>}
          <p>
            RecallGraph stores source-backed facts separately from AI enrichment. This page is not
            official safety advice; always verify details with the original source.
          </p>
        </div>
        <details className="recallgraph-raw">
          <summary>Technical metadata</summary>
          <pre>{JSON.stringify({
            source: recall.source,
            normalizedId: recall.id,
            sourceRecordId: recall.sourceRecordId,
            rawHash: recall.rawHash,
            embeddingCoverage,
            relatedLinkCount: related.length,
          }, null, 2)}</pre>
        </details>
      </article>
      <RelatedRecalls related={related} />
    </div>
  );
}
