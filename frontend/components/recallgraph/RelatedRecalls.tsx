import Link from "next/link";
import type { RecallGraphRelatedRecall } from "@/lib/recallgraph/types";

type Props = {
  related: RecallGraphRelatedRecall[];
};

export default function RelatedRecalls({ related }: Props) {
  if (!related.length) {
    return (
      <section className="recallgraph-empty">
        <h2>Related recalls</h2>
        <p>No related recall links have been built for this record yet.</p>
      </section>
    );
  }

  return (
    <section className="recallgraph-related" aria-label="Related recalls">
      <div className="recallgraph-section-heading">
        <h2>Related recalls</h2>
        <p>Connections come from shared companies, hazards, products, duplicate signals, or vector similarity.</p>
      </div>
      <div className="recallgraph-related-list">
        {related.map((item) => (
          <article className="recallgraph-related-item" key={`${item.id}-${item.linkType}`}>
            <div className="recallgraph-result-meta">
              <span>{item.linkType.replace(/_/g, " ")}</span>
              <span>Score {item.score.toFixed(2)}</span>
            </div>
            <h3>
              <Link href={`/recallgraph/recalls/${item.slug}`}>{item.title}</Link>
            </h3>
            <p>{item.reason || "Related by RecallGraph matching rules."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
