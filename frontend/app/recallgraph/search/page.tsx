import type { Metadata } from "next";
import RuntimeStatus from "@/components/recallgraph/RuntimeStatus";
import SearchBox from "@/components/recallgraph/SearchBox";
import SearchResults from "@/components/recallgraph/SearchResults";
import { getRecallGraphStats } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "Semantic Recall Search | RecallGraph",
  description:
    "Search public recall data by meaning, hazard, product, company, and consumer risk pattern with vector-search-ready RecallGraph ranking.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    source?: string;
    category?: string;
    company?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function RecallGraphSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const stats = await getRecallGraphStats();
  const embeddingCoverage = stats.totalRecalls
    ? Math.round((stats.embeddingsCoverageCount / stats.totalRecalls) * 100)
    : 0;

  return (
    <div className="recallgraph-page">
      <section className="recallgraph-search-hero" aria-labelledby="recallgraph-search-title">
        <div>
          <span className="recallgraph-eyebrow">Semantic recall search</span>
          <h1 id="recallgraph-search-title">Find recalls by risk pattern, product, company, or hazard.</h1>
          <p>
            Search source-backed FDA and CPSC records with vector ranking when embeddings are
            available and keyword fallback when they are not.
          </p>
        </div>
        <dl className="recallgraph-search-metrics" aria-label="RecallGraph search runtime">
          <div>
            <dt>Total recalls</dt>
            <dd>{stats.totalRecalls.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Embedding coverage</dt>
            <dd>{embeddingCoverage}%</dd>
          </div>
          <div>
            <dt>Related links</dt>
            <dd>{stats.relatedLinksCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Data mode</dt>
            <dd>{stats.dataMode}</dd>
          </div>
        </dl>
      </section>

      <div className="recallgraph-search-workspace">
        <SearchBox
          initialQuery={params.q}
          initialSource={params.source}
          initialCategory={params.category}
          initialCompany={params.company}
          initialFrom={params.from}
          initialTo={params.to}
        />
        <aside className="recallgraph-search-sidecar" aria-label="Search context">
          <RuntimeStatus stats={stats} compact />
          <section className="recallgraph-search-signal-panel">
            <span className="recallgraph-eyebrow">Ranking signals</span>
            <ul>
              <li>Canonical recall text</li>
              <li>Hazard, product, and company fields</li>
              <li>Source and date filters</li>
              <li>Related-recall graph context</li>
            </ul>
          </section>
        </aside>
      </div>

      <SearchResults
        query={params.q}
        source={params.source}
        category={params.category}
        company={params.company}
        from={params.from}
        to={params.to}
      />
    </div>
  );
}
