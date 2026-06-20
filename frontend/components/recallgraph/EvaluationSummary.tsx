import type { RecallGraphEvaluationReport } from "@/lib/recallgraph/types";

type Props = {
  report: RecallGraphEvaluationReport | null;
  markdown: string | null;
};

function metric(value: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "n/a";
}

export default function EvaluationSummary({ report, markdown }: Props) {
  if (!report) {
    return (
      <section className="recallgraph-empty">
        <h2>No evaluation report yet</h2>
        <p>
          Run the backend evaluation script to generate the latest report. Search evaluation helps
          separate a good-looking demo from measurable retrieval quality.
        </p>
        <code>npm run recallgraph:evaluate</code>
      </section>
    );
  }

  return (
    <section className="recallgraph-evaluation" aria-label="Search evaluation summary">
      <div className="recallgraph-panel recallgraph-evaluation-intro">
        <h2>Why search evaluation matters</h2>
        <p>
          RecallGraph uses starter queries to check whether safety intents return useful results,
          where zero-result gaps appear, and what should be improved before relying on semantic
          ranking in production.
        </p>
        <p>
          Current limitation: the starter set records query coverage and latency, but the next
          stronger step is expected recall IDs plus real embeddings.
        </p>
      </div>
      <div className="recallgraph-stats">
        <div className="recallgraph-stat-card">
          <span>Starter queries</span>
          <strong>{report.queryCount}</strong>
        </div>
        <div className="recallgraph-stat-card">
          <span>Returned results</span>
          <strong>{report.queriesWithResults}</strong>
        </div>
        <div className="recallgraph-stat-card">
          <span>Zero results</span>
          <strong>{report.zeroResultQueries}</strong>
        </div>
        <div className="recallgraph-stat-card">
          <span>Avg latency</span>
          <strong>{report.averageLatencyMs} ms</strong>
        </div>
        <div className="recallgraph-stat-card">
          <span>Recall@5</span>
          <strong>{metric(report.metrics.recallAt5)}</strong>
        </div>
        <div className="recallgraph-stat-card">
          <span>MRR</span>
          <strong>{metric(report.metrics.mrr)}</strong>
        </div>
      </div>
      {markdown ? <pre className="recallgraph-report">{markdown}</pre> : null}
    </section>
  );
}
