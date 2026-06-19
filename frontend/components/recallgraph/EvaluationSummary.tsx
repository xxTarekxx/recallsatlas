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
        <p>Run the backend evaluation script to generate the latest report.</p>
        <code>npm run recallgraph:evaluate</code>
      </section>
    );
  }

  return (
    <section className="recallgraph-evaluation" aria-label="Search evaluation summary">
      <div className="recallgraph-stats">
        <div className="recallgraph-stat-card">
          <span>Queries</span>
          <strong>{report.queryCount}</strong>
        </div>
        <div className="recallgraph-stat-card">
          <span>With results</span>
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
