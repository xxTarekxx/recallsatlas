"use client";

import { useMemo } from "react";

type Props = {
  initialQuery?: string;
  initialSource?: string;
  initialCategory?: string;
  initialCompany?: string;
  initialFrom?: string;
  initialTo?: string;
};

export default function SearchBox({
  initialQuery = "",
  initialSource = "",
  initialCategory = "",
  initialCompany = "",
  initialFrom = "",
  initialTo = "",
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
        <span className="recallgraph-eyebrow">Search console</span>
        <h2>Describe the risk, product, brand, or company.</h2>
        <p>
          Use plain language for semantic matching, then narrow by source, category, company, or date.
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
        <label className="recallgraph-field">
          <span>From</span>
          <input name="from" type="date" defaultValue={initialFrom} />
        </label>
        <label className="recallgraph-field">
          <span>To</span>
          <input name="to" type="date" defaultValue={initialTo} />
        </label>
        <button className="recallgraph-button" type="submit">
          Search RecallGraph
        </button>
      </form>
      <div className="recallgraph-demo-query-shell">
        <span>Examples</span>
        <div className="recallgraph-demo-queries" aria-label="Example searches">
          {demoQueries.map((query) => (
            <a key={query} href={`/recallgraph/search?q=${encodeURIComponent(query)}`}>
              {query}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
