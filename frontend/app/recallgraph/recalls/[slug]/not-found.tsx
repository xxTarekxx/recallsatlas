import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recall record not found | RecallGraph",
  description: "RecallGraph could not find a normalized recall record for this URL.",
};

export default function RecallGraphRecordNotFound() {
  return (
    <div className="recallgraph-page">
      <section className="recallgraph-missing-record" aria-labelledby="recallgraph-missing-title">
        <span className="recallgraph-eyebrow">RecallGraph record lookup</span>
        <h1 id="recallgraph-missing-title">Recall record not found</h1>
        <p>
          This URL does not match a normalized RecallGraph recall slug. The record may have moved,
          the link may be incomplete, or the source data may not be loaded in this environment.
        </p>
        <div className="recallgraph-record-actions" aria-label="Find a RecallGraph record">
          <Link className="recallgraph-action-primary" href="/recallgraph/search">
            Search RecallGraph
          </Link>
          <Link href="/recallgraph/dashboard">View data dashboard</Link>
          <Link href="/recallgraph">RecallGraph overview</Link>
        </div>
      </section>

      <section className="recallgraph-missing-grid" aria-label="Ways to continue">
        <div className="recallgraph-record-panel">
          <span className="recallgraph-eyebrow">Try search</span>
          <h2>Use source, brand, product, or hazard terms</h2>
          <p>
            RecallGraph search can find records by official source, product language, company names,
            categories, hazards, and related recall signals.
          </p>
        </div>
        <div className="recallgraph-record-panel">
          <span className="recallgraph-eyebrow">Check coverage</span>
          <h2>Confirm the data loaded</h2>
          <p>
            The dashboard shows current recall counts, embedding coverage, source mix, and whether
            the runtime is using database-backed RecallGraph data.
          </p>
        </div>
      </section>
    </div>
  );
}
