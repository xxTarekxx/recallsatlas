import type { Metadata } from "next";
import RuntimeStatus from "@/components/recallgraph/RuntimeStatus";
import SearchBox from "@/components/recallgraph/SearchBox";
import SearchResults from "@/components/recallgraph/SearchResults";
import { getRecallGraphStats, searchRecallGraph } from "@/lib/recallgraph/server/data";

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
  const [stats, results] = await Promise.all([
    getRecallGraphStats(),
    searchRecallGraph({
      q: params.q,
      source: params.source,
      category: params.category,
      company: params.company,
      from: params.from,
      to: params.to,
      limit: 20,
    }),
  ]);

  return (
    <div className="recallgraph-page">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Semantic recall search</span>
        <h1>Search by meaning, hazard, product, company, or consumer risk pattern.</h1>
        <p>
          RecallGraph ranks results through its vector/search pipeline with keyword fallback when
          embeddings or database search are unavailable.
        </p>
      </div>
      <RuntimeStatus stats={stats} compact />
      <SearchBox
        initialQuery={params.q}
        initialSource={params.source}
        initialCategory={params.category}
        initialCompany={params.company}
      />
      <SearchResults query={params.q} results={results} />
    </div>
  );
}
