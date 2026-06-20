"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RecallGraphSearchResult } from "@/lib/recallgraph/types";

type Props = {
  query?: string;
  source?: string;
  category?: string;
  company?: string;
  from?: string;
  to?: string;
  initialResults?: RecallGraphSearchResult[];
};

type SearchState = {
  loading: boolean;
  error: string | null;
  results: RecallGraphSearchResult[];
};

const EMPTY_RESULTS: RecallGraphSearchResult[] = [];

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}

function clean(value: string | undefined) {
  return String(value || "").trim();
}

function sourceLabel(value: string | undefined) {
  if (!value) return "";
  return value.toUpperCase();
}

function formatMatchScore(value: number) {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
}

export default function SearchResults({
  query,
  source,
  category,
  company,
  from,
  to,
  initialResults = EMPTY_RESULTS,
}: Props) {
  const normalizedQuery = clean(query);
  const activeFilters = [
    source ? `Source: ${sourceLabel(source)}` : "",
    category ? `Category: ${category}` : "",
    company ? `Company: ${company}` : "",
    from ? `From: ${from}` : "",
    to ? `To: ${to}` : "",
  ].filter(Boolean);
  const searchUrl = useMemo(() => {
    if (!normalizedQuery) return "";
    const params = new URLSearchParams();
    params.set("q", normalizedQuery);
    if (source) params.set("source", source);
    if (category) params.set("category", category);
    if (company) params.set("company", company);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "20");
    return `/api/recallgraph/search?${params.toString()}`;
  }, [category, company, from, normalizedQuery, source, to]);

  const [state, setState] = useState<SearchState>({
    loading: Boolean(searchUrl),
    error: null,
    results: initialResults,
  });

  useEffect(() => {
    if (!searchUrl) {
      setState({ loading: false, error: null, results: initialResults });
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    fetch(searchUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("RecallGraph search unavailable.");
        const data = await response.json();
        setState({
          loading: false,
          error: null,
          results: Array.isArray(data.results) ? data.results : [],
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ loading: false, error: "RecallGraph search unavailable.", results: [] });
      });

    return () => controller.abort();
  }, [initialResults, searchUrl]);

  if (!normalizedQuery) {
    if (state.results.length) {
      return (
        <section className="recallgraph-results" aria-label="Latest RecallGraph records">
          <div className="recallgraph-section-heading">
            <h2>Latest normalized recalls</h2>
            <p>{state.results.length} recalls returned from the RecallGraph search layer.</p>
          </div>
          <SearchResultList results={state.results} />
        </section>
      );
    }

    return (
      <section className="recallgraph-search-empty">
        <span className="recallgraph-eyebrow">Ready for a query</span>
        <h2>Start with a risk pattern or product phrase.</h2>
        <p>
          RecallGraph works best with the words a consumer would use: overheating battery,
          undeclared milk, choking hazard, contaminated pet food, or a specific company name.
        </p>
        <div className="recallgraph-search-empty-grid" aria-label="Search examples by intent">
          <div>
            <strong>Consumer risk</strong>
            <span>fire hazard, choking, contamination</span>
          </div>
          <div>
            <strong>Product context</strong>
            <span>baby wipes, snack mix, pet food</span>
          </div>
          <div>
            <strong>Source filters</strong>
            <span>FDA, CPSC, date range, company</span>
          </div>
        </div>
      </section>
    );
  }

  if (state.loading) {
    return (
      <section className="recallgraph-search-empty">
        <span className="recallgraph-eyebrow">Searching</span>
        <h2>Searching RecallGraph</h2>
        <p>Matching the query against the RecallGraph search layer.</p>
      </section>
    );
  }

  if (state.error || !state.results.length) {
    return (
      <section className="recallgraph-search-empty">
        <span className="recallgraph-eyebrow">No results</span>
        <h2>No matching recalls yet</h2>
        <p>
          Try a broader hazard, product type, company, or source filter. If the database is not
          configured, only static fallback data can be searched.
        </p>
      </section>
    );
  }

  return (
    <section className="recallgraph-results" aria-label="RecallGraph search results">
      <div className="recallgraph-section-heading">
        <span className="recallgraph-eyebrow">Search results</span>
        <h2>{`Results for "${normalizedQuery}"`}</h2>
        <p>{state.results.length} recalls returned from the RecallGraph search layer.</p>
        {activeFilters.length ? (
          <div className="recallgraph-active-filters" aria-label="Active filters">
            {activeFilters.map((filter) => (
              <span key={filter}>{filter}</span>
            ))}
          </div>
        ) : null}
      </div>
      <SearchResultList results={state.results} />
    </section>
  );
}

function SearchResultList({ results }: { results: RecallGraphSearchResult[] }) {
  return (
    <div className="recallgraph-result-list">
      {results.map((result) => (
        <article className="recallgraph-result" key={result.id}>
          <div className="recallgraph-result-meta">
            <span>{result.source.toUpperCase()}</span>
            <span>{formatDate(result.recallDate)}</span>
            <span>Match {formatMatchScore(result.similarity)}</span>
            {typeof result.relatedCount === "number" ? <span>{result.relatedCount} related</span> : null}
          </div>
          <h3>
            <Link href={`/recallgraph/recalls/${result.slug}`}>{result.title}</Link>
          </h3>
          <dl className="recallgraph-result-facts">
            <div>
              <dt>Company</dt>
              <dd>{result.company || "Unknown"}</dd>
            </div>
            <div>
              <dt>Product / category</dt>
              <dd>{result.product || result.category || "Not specified"}</dd>
            </div>
            <div>
              <dt>Hazard</dt>
              <dd>{result.hazard || "Not specified"}</dd>
            </div>
          </dl>
          {result.sourceUrl ? (
            <a className="recallgraph-source-link" href={result.sourceUrl}>
              Official source
            </a>
          ) : null}
          <Link className="recallgraph-detail-link" href={`/recallgraph/recalls/${result.slug}`}>
            Source-backed detail
          </Link>
        </article>
      ))}
    </div>
  );
}
