import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import RelatedRecalls from "@/components/recallgraph/RelatedRecalls";
import { recallDetailRobots } from "@/lib/recallNoindex";
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

function sourceLabel(source: string) {
  if (source === "fda") return "FDA";
  if (source === "cpsc") return "CPSC";
  if (source === "nhtsa") return "NHTSA";
  return source.toUpperCase();
}

function cleanList(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function statusText(value: string) {
  return value.replace(/_/g, " ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recall = await getRecallGraphRecallBySlug(slug);
  return {
    title: recall ? `${recall.title} | RecallGraph` : "Recall not found | RecallGraph",
    description:
      recall?.description ||
      "RecallGraph source-backed recall detail with related recall graph context and public safety data metadata.",
    robots: recallDetailRobots,
  };
}

export default async function RecallGraphDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const recall = await getRecallGraphRecallBySlug(slug);
  if (!recall) notFound();
  const [related, health] = await Promise.all([getRecallGraphRelated(recall.id), getRecallGraphHealth()]);
  const embeddingCoverage = health.embeddingCount > 0 ? "available in configured database" : "not available in this runtime";
  const recallDate = formatDate(recall.recallDate || recall.publishedAt);
  const normalizedAt = recall.normalizedAt ? formatDate(recall.normalizedAt) : "Unknown";
  const hazardText = recall.hazards.length ? recall.hazards.join("; ") : "Not specified";
  const actionText = recall.consumerAction || recall.remedy || "Review the official source before taking action.";
  const productText = recall.productName || recall.productDescription || "Not specified";
  const categoryText = recall.productType || recall.category || "Not specified";
  const brandCompany = cleanList([recall.brandName, recall.companyName]).join(" / ") || "Not specified";
  const runtimeLabel = health.database === "ok" ? "Database-backed" : "Fallback mode";

  return (
    <div className="recallgraph-page">
      <article className="recallgraph-record">
        <header className="recallgraph-record-hero">
          <div className="recallgraph-record-title">
            <div className="recallgraph-result-meta">
              <span>{sourceLabel(recall.source)}</span>
              <span>{recallDate}</span>
              <span>{recall.category || "uncategorized"}</span>
            </div>
            <h1>{recall.title}</h1>
            <p className="recallgraph-lede">{recall.description}</p>
            <div className="recallgraph-record-actions" aria-label="Recall actions">
              {recall.sourceUrl ? (
                <a className="recallgraph-action-primary" href={recall.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Official source
                </a>
              ) : null}
              <Link href={`/recallgraph/search?q=${encodeURIComponent(recall.title)}`}>Search similar recalls</Link>
              <Link href="/recallgraph">RecallGraph overview</Link>
            </div>
          </div>
          <aside className="recallgraph-record-status" aria-label="RecallGraph runtime status">
            <span className="recallgraph-eyebrow">{runtimeLabel}</span>
            <dl>
              <div>
                <dt>Database</dt>
                <dd>{statusText(health.database)}</dd>
              </div>
              <div>
                <dt>Embeddings</dt>
                <dd>{health.embeddingProvider}</dd>
              </div>
              <div>
                <dt>Related links</dt>
                <dd>{related.length}</dd>
              </div>
            </dl>
          </aside>
        </header>

        <section className="recallgraph-record-grid" aria-label="Recall summary">
          <div className="recallgraph-record-panel recallgraph-record-panel--alert">
            <span className="recallgraph-eyebrow">Primary concern</span>
            <h2>Hazard or reason</h2>
            <p>{hazardText}</p>
          </div>
          <div className="recallgraph-record-panel recallgraph-record-panel--safe">
            <span className="recallgraph-eyebrow">Recommended next step</span>
            <h2>Consumer action</h2>
            <p>{actionText}</p>
          </div>
        </section>

        <section className="recallgraph-record-details" aria-label="Affected product details">
          <div className="recallgraph-section-heading">
            <span className="recallgraph-eyebrow">Affected product</span>
            <h2>What this record says</h2>
          </div>
          <dl className="recallgraph-detail-facts">
            <div>
              <dt>Company / brand</dt>
              <dd>{brandCompany}</dd>
            </div>
            <div>
              <dt>Product</dt>
              <dd>{productText}</dd>
            </div>
            <div>
              <dt>Product / category</dt>
              <dd>{categoryText}</dd>
            </div>
            <div>
              <dt>Source record ID</dt>
              <dd>{recall.sourceRecordId || recall.id}</dd>
            </div>
          </dl>
        </section>

        {recall.images.length ? (
          <section className="recallgraph-record-media" aria-label="Recall images">
            <div className="recallgraph-section-heading">
              <span className="recallgraph-eyebrow">Product images</span>
              <h2>Source imagery</h2>
            </div>
            <div className="recallgraph-image-grid">
              {recall.images.slice(0, 4).map((image) => (
                <figure key={image.url}>
                  <img src={image.url} alt={image.alt || recall.title} />
                  <figcaption>{image.alt || "Recall source image"}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <section className="recallgraph-provenance" aria-label="Source and AI metadata">
          <div className="recallgraph-provenance-copy">
            <span className="recallgraph-eyebrow">Source-backed facts</span>
            <h2>Provenance and AI use</h2>
            <p>
              RecallGraph keeps source facts, vector ranking, and related-recall discovery separate.
              Use this page for discovery, then verify instructions with the original source.
            </p>
          </div>
          <dl>
            <div>
              <dt>Official source</dt>
              <dd>
                {recall.sourceUrl ? (
                  <a href={recall.sourceUrl} target="_blank" rel="noopener noreferrer">
                    View original notice
                  </a>
                ) : (
                  "No source URL recorded"
                )}
              </dd>
            </div>
            <div>
              <dt>Normalized</dt>
              <dd>{normalizedAt}</dd>
            </div>
            <div>
              <dt>Embedding coverage</dt>
              <dd>{embeddingCoverage}</dd>
            </div>
          </dl>
        </section>

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
