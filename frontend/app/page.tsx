import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/lib/mongodb";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://recallsatlas.com";

export const metadata: Metadata = {
  title: "RecallsAtlas | FDA & NHTSA Recall Search",
  description:
    "Browse FDA food, drug, medical device, and supplement recalls in one place. Public safety data with plain-language summaries and direct links to official FDA.gov notices.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "RecallsAtlas — FDA & vehicle recalls",
    description:
      "Search and browse U.S. food, drug, device, supplement, and vehicle recalls. Aggregated from official FDA and NHTSA sources.",
    url: siteUrl,
    siteName: "RecallsAtlas",
    type: "website",
    locale: "en_US",
  },
};

export default async function HomePage() {
  let recallsCountText = "239+";
  try {
    const db = await getDb();
    const recallsCount = await db.collection("recalls").countDocuments();
    recallsCountText = `${new Intl.NumberFormat("en-US").format(recallsCount)}+`;
  } catch {
    // Keep fallback value when DB is temporarily unavailable.
  }

  return (
    <div className="homepage">

      {/* ── Hero ───────────────────────────────────── */}
      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="home-hero-inner">
          <div className="home-hero-badge" aria-label="Live data">
            <span className="home-hero-badge-dot" aria-hidden="true" />
            Updated daily from FDA.gov
          </div>

          <h1 id="hero-heading" className="home-hero-title">
            U.S. Recall Data,<br />
            <span>Clear &amp; Searchable</span>
          </h1>

          <p className="home-hero-subtitle">
            Search FDA food, drug, medical device, and supplement recalls.
            Plain-language summaries with direct links to official government notices.
          </p>

          {/* Search — routes to /recalls?q= */}
          <form
            className="home-hero-search"
            action="/recalls"
            method="get"
            role="search"
            aria-label="Search recalls"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search recalls by product, brand, or keyword
            </label>
            <input
              id="hero-search"
              type="search"
              name="q"
              className="home-hero-search-input"
              placeholder="Search by product, brand, or keyword…"
              autoComplete="off"
              aria-label="Search recalls"
            />
            <button type="submit" className="home-hero-search-btn" aria-label="Submit search">
              Search
            </button>
          </form>

          {/* Stats */}
          <div className="home-stats" aria-label="Site statistics">
            <div className="home-stat">
              <span className="home-stat-value">{recallsCountText}</span>
              <span className="home-stat-label">Recalls Tracked</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">FDA</span>
              <span className="home-stat-label">Official Source</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">19+</span>
              <span className="home-stat-label">Languages</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">Free</span>
              <span className="home-stat-label">Always</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────── */}
      <section className="home-categories" aria-labelledby="categories-heading">
        <p className="home-section-label" aria-hidden="true">Browse by source</p>
        <h2 id="categories-heading" className="home-section-title">
          Choose a recall category
        </h2>

        <div className="home-category-grid">
          {/* FDA */}
          <Link
            href="/recalls"
            className="home-category-card"
            aria-label="Browse FDA Recalls — drugs, food, medical devices, supplements"
          >
            <span className="home-category-icon home-category-icon--fda" aria-hidden="true">
              FDA
            </span>
            <h3>FDA Recalls</h3>
            <p>
              Drugs, food products, medical devices, dietary supplements, cosmetics,
              and biologics recalled by the U.S. Food &amp; Drug Administration.
            </p>
            <span className="home-category-pill" aria-hidden="true">
              Browse FDA recalls →
            </span>
          </Link>

          {/* NHTSA — coming soon */}
          <div
            className="home-category-card home-category-card--disabled"
            aria-label="Vehicle Recalls — coming soon"
            role="note"
          >
            <span className="home-category-icon home-category-icon--nhtsa" aria-hidden="true">
              NHTSA
            </span>
            <h3>Vehicle Recalls</h3>
            <p>
              Cars, trucks, motorcycles, and related equipment recalled by the
              National Highway Traffic Safety Administration. Coming soon.
            </p>
            <span className="home-category-pill home-category-pill--disabled" aria-hidden="true">
              Coming soon
            </span>
          </div>
        </div>
      </section>

      {/* ── About ──────────────────────────────────── */}
      <section className="home-about" aria-labelledby="about-heading">
        <div className="home-about-inner">
          <p className="home-section-label" aria-hidden="true">About this site</p>
          <h2 id="about-heading" className="home-section-title">
            About RecallsAtlas
          </h2>
          <p>
            RecallsAtlas brings together public recall information from the{" "}
            <strong>U.S. Food and Drug Administration (FDA)</strong> and the{" "}
            <strong>National Highway Traffic Safety Administration (NHTSA)</strong>.
            Whether you are checking a medication, food product, medical device, or a
            car or truck, you can start here and follow through to the official
            government notice for full details.
          </p>
          <p>
            Summaries on this site are for quick orientation. Always confirm lot numbers,
            dates, and instructions on the <strong>FDA or NHTSA source</strong> linked
            directly from each recall page. We are committed to improving accessibility
            (WCAG-minded patterns, keyboard navigation, and readable contrast) and
            expanding support to <strong>11 languages</strong> so recall
            information reaches more people worldwide.
          </p>
          <p>
            RecallsAtlas is an{" "}
            <strong>independent aggregator</strong> and is not affiliated with or
            endorsed by the FDA or NHTSA. Data is compiled from public feeds and pages
            for informational purposes only.{" "}
            <Link href="/about">Learn more →</Link>
          </p>
        </div>
      </section>

    </div>
  );
}
