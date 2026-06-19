import Link from "next/link";
import type { Metadata } from "next";
import SearchResults from "@/components/recallgraph/SearchResults";
import StatsCards from "@/components/recallgraph/StatsCards";
import { getRecallGraphStats, searchRecallGraph } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "RecallGraph MVP",
  description:
    "RecallGraph is the Recalls Atlas AI and data engineering workspace for normalized recall data, semantic search, graph links, and evaluation.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecallGraphHomePage() {
  const [stats, latest] = await Promise.all([
    getRecallGraphStats(),
    searchRecallGraph({ limit: 6 }),
  ]);

  return (
    <div className="recallgraph-page">
      <section className="recallgraph-hero">
        <div>
          <span className="recallgraph-eyebrow">RecallGraph MVP</span>
          <h1>AI-ready recall intelligence built from FDA and CPSC source data</h1>
          <p>
            Explore normalized recall records, source-backed search, related recall links, and
            evaluation metrics without disturbing the existing Recalls Atlas MongoDB flow.
          </p>
        </div>
        <nav className="recallgraph-actions" aria-label="RecallGraph sections">
          <Link href="/recallgraph/search">Search</Link>
          <Link href="/recallgraph/dashboard">Dashboard</Link>
          <Link href="/recallgraph/evaluation">Evaluation</Link>
        </nav>
      </section>
      <StatsCards stats={stats} />
      <SearchResults results={latest} />
    </div>
  );
}
