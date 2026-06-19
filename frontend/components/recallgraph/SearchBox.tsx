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
      <form className="recallgraph-search-form" action="/recallgraph/search">
        <label className="recallgraph-field recallgraph-field--wide">
          <span>Search recalls</span>
          <input
            name="q"
            type="search"
            defaultValue={initialQuery}
            placeholder="Search hazards, products, companies, or source facts"
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
          Search
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
