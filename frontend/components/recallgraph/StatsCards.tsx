import type { RecallGraphStats } from "@/lib/recallgraph/types";

type Props = {
  stats: RecallGraphStats;
};

function NumberCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="recallgraph-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function StatsCards({ stats }: Props) {
  const embeddingCoverage =
    stats.totalRecalls > 0
      ? `${stats.embeddingsCoverageCount.toLocaleString("en-US")} / ${stats.totalRecalls.toLocaleString("en-US")}`
      : stats.embeddingsCoverageCount.toLocaleString("en-US");

  return (
    <section className="recallgraph-stats" aria-label="RecallGraph statistics">
      <NumberCard label="Dataset coverage" value={stats.totalRecalls.toLocaleString("en-US")} />
      <NumberCard label="FDA records" value={stats.totalFdaRecalls.toLocaleString("en-US")} />
      <NumberCard label="CPSC/general records" value={stats.totalCpscRecalls.toLocaleString("en-US")} />
      <NumberCard label="Embedding coverage" value={embeddingCoverage} />
      <NumberCard label="Related recall graph" value={stats.relatedLinksCount.toLocaleString("en-US")} />
      <NumberCard label="Evaluation queries" value={stats.evaluationQueryCount.toLocaleString("en-US")} />
    </section>
  );
}
