import Link from "next/link";
import type { Metadata } from "next";
import RuntimeStatus from "@/components/recallgraph/RuntimeStatus";
import SearchBox from "@/components/recallgraph/SearchBox";
import SearchResults from "@/components/recallgraph/SearchResults";
import StatsCards from "@/components/recallgraph/StatsCards";
import { getRecallGraphStats, searchRecallGraph } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "RecallGraph: AI Recall Intelligence Platform",
  description:
    "AI recall intelligence, semantic recall search, related recall graph analysis, and transparent public recall data pipeline reporting.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecallGraphHomePage() {
  const [stats, latest] = await Promise.all([
    getRecallGraphStats(),
    searchRecallGraph({ limit: 6 }),
  ]);
  const pipeline = [
    "public recall data ingestion",
    "deterministic normalization",
    "canonical recall text",
    "embeddings/vector search",
    "related recall graph",
    "evaluation reports",
  ];
  const features = [
    {
      title: "Semantic Recall Search",
      body: "Search by meaning, hazard, product, company, or consumer risk pattern instead of only exact keywords.",
    },
    {
      title: "Related Recall Graph",
      body: "Connect recalls through shared hazards, companies, products, duplicate signals, and vector similarity when available.",
    },
    {
      title: "Hazard/Company/Product Trends",
      body: "Summarize source mix, top hazards, company patterns, category coverage, and data quality gaps.",
    },
    {
      title: "Search Quality Evaluation",
      body: "Track starter queries, zero-result cases, latency, and the path toward expected-ID based relevance scoring.",
    },
    {
      title: "Source-Backed Recall Details",
      body: "Keep public recall facts linked to source records while separating AI search and ranking from official notices.",
    },
  ];

  return (
    <div className="recallgraph-page">
      <section className="recallgraph-hero">
        <div>
          <span className="recallgraph-eyebrow">AI recall intelligence</span>
          <h1>RecallGraph: AI Recall Intelligence from Structured Public Safety Data</h1>
          <p>
            Search recalls by meaning, explore related hazards, analyze company and product
            patterns, and inspect the data pipeline behind every result.
          </p>
        </div>
        <nav className="recallgraph-actions" aria-label="RecallGraph sections">
          <Link className="recallgraph-action-primary" href="/recallgraph/search">Try Semantic Search</Link>
          <Link href="/recallgraph/dashboard">View Data Dashboard</Link>
          <Link href="/recallgraph/evaluation">See Search Evaluation</Link>
        </nav>
      </section>
      <RuntimeStatus stats={stats} />
      <SearchBox />
      <StatsCards stats={stats} />
      <section className="recallgraph-pipeline" aria-labelledby="recallgraph-pipeline-heading">
        <div className="recallgraph-section-heading">
          <span className="recallgraph-eyebrow">Transparent data pipeline</span>
          <h2 id="recallgraph-pipeline-heading">How RecallGraph works</h2>
          <p>
            The system keeps ingestion, normalization, embeddings, graph construction, and
            evaluation separate so the data platform can be audited and improved.
          </p>
        </div>
        <ol>
          {pipeline.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </section>
      <section className="recallgraph-feature-grid" aria-label="RecallGraph platform features">
        {features.map((feature) => (
          <article className="recallgraph-panel" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>
      <section className="recallgraph-source-box">
        <span className="recallgraph-eyebrow">Methodology</span>
        <h2>Public data, transparent AI usage</h2>
        <p>
          RecallGraph uses public recall data and links back to source records. AI/ML is used for
          search, organization, ranking, and pattern discovery. RecallGraph is not official
          government advice and is not a medical, legal, or safety authority.
        </p>
      </section>
      <SearchResults initialResults={latest} />
    </div>
  );
}
