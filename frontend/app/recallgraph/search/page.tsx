import type { Metadata } from "next";
import SearchBox from "@/components/recallgraph/SearchBox";
import SearchResults from "@/components/recallgraph/SearchResults";
import { searchRecallGraph } from "@/lib/recallgraph/server/data";

export const metadata: Metadata = {
  title: "RecallGraph Search",
  description: "Semantic and fallback keyword search over normalized RecallGraph records.",
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
  const results = await searchRecallGraph({
    q: params.q,
    source: params.source,
    category: params.category,
    company: params.company,
    from: params.from,
    to: params.to,
    limit: 20,
  });

  return (
    <div className="recallgraph-page">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Semantic Search</span>
        <h1>Search source-backed recall facts</h1>
        <p>Uses pgvector embeddings when available, with a deterministic normalized JSON fallback.</p>
      </div>
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
