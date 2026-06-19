import type { Metadata } from "next";
import StatsCards from "@/components/recallgraph/StatsCards";
import { getRecallGraphStats } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "RecallGraph Dashboard",
  description: "RecallGraph normalized recall statistics and data quality coverage.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecallGraphDashboardPage() {
  const stats = await getRecallGraphStats();

  return (
    <div className="recallgraph-page">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Statistics</span>
        <h1>RecallGraph dashboard</h1>
        <p>Snapshot of normalized recall coverage, field completeness, categories, hazards, and sources.</p>
      </div>
      <StatsCards stats={stats} />
      <section className="recallgraph-dashboard-grid">
        <div className="recallgraph-panel">
          <h2>Top companies</h2>
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
          <h2>Top hazards</h2>
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
          <h2>Top categories</h2>
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
          <h2>Data quality</h2>
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
      </section>
    </div>
  );
}
