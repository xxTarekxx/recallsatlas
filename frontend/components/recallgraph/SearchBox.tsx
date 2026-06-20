"use client";

import { useMemo } from "react";

type Props = {
  initialQuery?: string;
  initialSource?: string;
  initialCategory?: string;
  initialCompany?: string;
};

export default function SearchBox({
  initialQuery = "",
  initialSource = "",
  initialCategory = "",
  initialCompany = "",
}: Props) {
  const demoQueries = useMemo(
    () => [
      "battery overheating in children's products",
      "fire hazard from battery chargers",
      "undeclared allergens in snacks",
      "children choking hazard",
      "lithium battery overheating",
      "salmonella contamination",
    ],
    []
  );

  return (
    <section className="recallgraph-search-panel" aria-label="RecallGraph search">
      <div className="recallgraph-search-intro">
        <h2>Search by meaning, hazard, product, company, or consumer risk pattern.</h2>
        <p>
          RecallGraph ranks results through its vector/search pipeline with keyword fallback when
          embeddings or database search are unavailable.
        </p>
      </div>
      <form className="recallgraph-search-form" action="/recallgraph/search">
        <label className="recallgraph-field recallgraph-field--wide">
          <span>Semantic recall query</span>
          <input
            name="q"
            type="search"
            defaultValue={initialQuery}
            placeholder="battery overheating in children's products"
          />
        </label>
        <label className="recallgraph-field">
          <span>Source</span>
          <select name="source" defaultValue={initialSource}>
            <option value="">All</option>
            <option value="fda">FDA</option>
            <option value="cpsc">CPSC</option>
          </select>
        </label>
        <label className="recallgraph-field">
          <span>Category</span>
          <input name="category" defaultValue={initialCategory} placeholder="food, pet-food" />
        </label>
        <label className="recallgraph-field">
          <span>Company</span>
          <input name="company" defaultValue={initialCompany} placeholder="Company name" />
        </label>
        <button className="recallgraph-button" type="submit">
          Search RecallGraph
        </button>
      </form>
      <div className="recallgraph-demo-queries" aria-label="Example searches">
        {demoQueries.map((query) => (
          <a key={query} href={`/recallgraph/search?q=${encodeURIComponent(query)}`}>
            {query}
          </a>
        ))}
      </div>
    </section>
  );
}
