import type { RecallGraphStats } from "@/lib/recallgraph/types";

type Props = {
  stats: RecallGraphStats;
  compact?: boolean;
};

function modeLabel(stats: RecallGraphStats) {
  if (stats.databaseStatus === "ok" && stats.embeddingProvider === "openai") {
    return "Vector search ready";
  }
  if (stats.databaseStatus === "ok" && stats.embeddingProvider === "mock") {
    return "Demo mode";
  }
  if (stats.databaseStatus === "not_configured") return "Database not configured";
  if (stats.databaseStatus === "unreachable") return "Database unreachable";
  return "Runtime status";
}

export default function RuntimeStatus({ stats, compact = false }: Props) {
  const isMock = stats.embeddingProvider === "mock";
  const dbMissing = stats.databaseStatus === "not_configured";
  const dbUnreachable = stats.databaseStatus === "unreachable";

  return (
    <section className={`recallgraph-status${compact ? " recallgraph-status--compact" : ""}`}>
      <div>
        <span className="recallgraph-eyebrow">{modeLabel(stats)}</span>
        <h2>Runtime mode</h2>
        <p>
          Database: <strong>{stats.databaseStatus.replace("_", " ")}</strong>. Embedding provider:{" "}
          <strong>{stats.embeddingProvider}</strong>. Data mode: <strong>{stats.dataMode}</strong>.
        </p>
      </div>
      {isMock ? (
        <p className="recallgraph-notice">
          Demo mode: embeddings are currently using the configured mock provider. Configure real
          embeddings for production semantic ranking.
        </p>
      ) : null}
      {dbMissing ? (
        <p className="recallgraph-notice">
          RecallGraph database is not configured in this environment yet. The interface is ready,
          but semantic ranking requires the production database and embeddings.
        </p>
      ) : null}
      {dbUnreachable ? (
        <p className="recallgraph-notice">
          RecallGraph database settings are present, but the database is unreachable. Static
          normalized data and keyword-style fallback views remain available when files are present.
        </p>
      ) : null}
    </section>
  );
}
