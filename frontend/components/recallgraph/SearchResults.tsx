import Link from "next/link";
import type { RecallGraphSearchResult } from "@/lib/recallgraph/types";

type Props = {
  query?: string;
  results: RecallGraphSearchResult[];
};

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}

export default function SearchResults({ query, results }: Props) {
  if (!results.length) {
    return (
      <section className="recallgraph-empty">
        <h2>No matching recalls yet</h2>
        <p>
          Try a broader hazard, product type, company, or source filter. If the database is not
          configured, only static fallback data can be searched.
        </p>
      </section>
    );
  }

  return (
    <section className="recallgraph-results" aria-label="RecallGraph search results">
      <div className="recallgraph-section-heading">
        <h2>{query ? `Results for "${query}"` : "Latest normalized recalls"}</h2>
        <p>{results.length} recalls returned from the RecallGraph search layer.</p>
      </div>
      <div className="recallgraph-result-list">
        {results.map((result) => (
          <article className="recallgraph-result" key={result.id}>
            <div className="recallgraph-result-meta">
              <span>{result.source.toUpperCase()}</span>
              <span>{formatDate(result.recallDate)}</span>
              <span>Relevance {result.similarity.toFixed(2)}</span>
              {typeof result.relatedCount === "number" ? <span>{result.relatedCount} related</span> : null}
            </div>
            <h3>
              <Link href={`/recallgraph/recalls/${result.slug}`}>{result.title}</Link>
            </h3>
            <dl className="recallgraph-result-facts">
              <div>
                <dt>Company</dt>
                <dd>{result.company || "Unknown"}</dd>
              </div>
              <div>
                <dt>Product / category</dt>
                <dd>{result.product || result.category || "Not specified"}</dd>
              </div>
              <div>
                <dt>Hazard</dt>
                <dd>{result.hazard || "Not specified"}</dd>
              </div>
            </dl>
            {result.sourceUrl ? (
              <a className="recallgraph-source-link" href={result.sourceUrl}>
                Official source
              </a>
            ) : null}
            <Link className="recallgraph-detail-link" href={`/recallgraph/recalls/${result.slug}`}>
              Source-backed detail
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
