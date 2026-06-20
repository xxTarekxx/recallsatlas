import type { Metadata } from "next";
import RuntimeStatus from "@/components/recallgraph/RuntimeStatus";
import StatsCards from "@/components/recallgraph/StatsCards";
import { getRecallGraphStats } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "Recall Data Dashboard | RecallGraph",
  description:
    "RecallGraph data intelligence dashboard for dataset coverage, source mix, embeddings, related recall graph links, hazard trends, and company patterns.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecallGraphDashboardPage() {
  const stats = await getRecallGraphStats();

  return (
    <div className="recallgraph-page">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Recall data dashboard</span>
        <h1>Dataset intelligence for public recall patterns</h1>
        <p>
          Coverage, source mix, embedding status, related recall graph density, hazard trends,
          company/product patterns, and data quality signals.
        </p>
      </div>
      <RuntimeStatus stats={stats} compact />
      <StatsCards stats={stats} />
      <section className="recallgraph-dashboard-grid">
        <div className="recallgraph-panel">
          <h2>Company/Product Patterns</h2>
          <ol>
            {stats.topCompanies.map((item) => (
              <li key={item.company}>
                <span>{item.company}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="recallgraph-panel">
          <h2>Hazard Trends</h2>
          <ol>
            {stats.topHazards.map((item) => (
              <li key={item.hazard}>
                <span>{item.hazard}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="recallgraph-panel">
          <h2>Top product/category types</h2>
          <ol>
            {stats.topCategories.map((item) => (
              <li key={item.category}>
                <span>{item.category}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="recallgraph-panel">
          <h2>Data Quality</h2>
          <ol>
            <li>
              <span>Missing source URL</span>
              <strong>{stats.missingImportantFields.sourceUrl}</strong>
            </li>
            <li>
              <span>Missing date</span>
              <strong>{stats.missingImportantFields.date}</strong>
            </li>
            <li>
              <span>Missing company</span>
              <strong>{stats.missingImportantFields.company}</strong>
            </li>
            <li>
              <span>Missing hazards</span>
              <strong>{stats.missingImportantFields.hazards}</strong>
            </li>
          </ol>
        </div>
        <div className="recallgraph-panel">
          <h2>Source Mix</h2>
          <ol>
            {stats.recallsBySource.map((item) => (
              <li key={item.source}>
                <span>{item.source.toUpperCase()}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="recallgraph-panel">
          <h2>Evaluation Status</h2>
          <ol>
            <li>
              <span>Starter queries</span>
              <strong>{stats.evaluationQueryCount}</strong>
            </li>
            <li>
              <span>Embedding provider</span>
              <strong>{stats.embeddingProvider}</strong>
            </li>
            <li>
              <span>Database status</span>
              <strong>{stats.databaseStatus.replace("_", " ")}</strong>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
