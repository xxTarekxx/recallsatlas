import Link from "next/link";
import RecallsListClient from "@/components/RecallsListClient";

const CATEGORIES = ["Drugs", "Food", "Medical Devices", "Supplements"];

export default function RecallsListPage() {
  return (
    <div className="recalls-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>
      <main className="main-content" style={{ overflow: "visible" }}>
        <h1>FDA Recalls</h1>
        <section className="filter-bar">
          <form className="filter-bar-search" action="/recalls" method="get">
            <input
              type="search"
              name="q"
              placeholder="Search recalls..."
              className="search-input"
              aria-label="Search recalls"
            />
            <button type="submit" className="search-btn">
              Search
            </button>
          </form>
          <span className="filter-bar-divider" aria-hidden="true">|</span>
          <div className="filter-bar-categories">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/category/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="filter-bar-pill"
              >
                {cat}
              </Link>
            ))}
          </div>
          <span className="filter-bar-divider" aria-hidden="true">|</span>
          <Link href="/brand" className="filter-bar-link">Brands</Link>
          <span className="filter-bar-divider" aria-hidden="true">|</span>
          <Link href="/year" className="filter-bar-link">Year</Link>
        </section>
        <RecallsListClient />
      </main>
    </div>
  );
}
