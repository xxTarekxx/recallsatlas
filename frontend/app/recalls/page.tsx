import Link from "next/link";
import RecallsListClient from "@/components/RecallsListClient";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import SearchSuggest from "@/components/SearchSuggest";

const CATEGORIES = ["Drugs", "Food", "Medical Devices", "Supplements"];

export default function RecallsListPage() {
  return (
    <div className="recalls-page">
      <header className="site-header">
        <SiteBrandLogoLink />
      </header>
      <main className="main-content" style={{ overflow: "visible" }}>
        <h1>FDA Recalls</h1>
        <section className="filter-bar">
          <SearchSuggest
            action="/recalls"
            wrapperClassName="filter-bar-search"
            inputClassName="search-input"
            buttonClassName="search-btn"
            placeholder="Search headline or product type..."
            ariaLabel="Search recalls"
          />
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
