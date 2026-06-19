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
  return (
    <section className="recallgraph-stats" aria-label="RecallGraph statistics">
      <NumberCard label="Total recalls" value={stats.totalRecalls.toLocaleString("en-US")} />
      <NumberCard label="FDA records" value={stats.totalFdaRecalls.toLocaleString("en-US")} />
      <NumberCard label="CPSC records" value={stats.totalCpscRecalls.toLocaleString("en-US")} />
      <NumberCard label="Embeddings" value={stats.embeddingsCoverageCount.toLocaleString("en-US")} />
      <NumberCard label="Related links" value={stats.relatedLinksCount.toLocaleString("en-US")} />
      <NumberCard label="Data mode" value={stats.dataMode} />
    </section>
  );
}
