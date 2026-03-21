import Link from "next/link";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://recallsatlas.com";

export const metadata: Metadata = {
  title: "RecallsAtlas | FDA & NHTSA recall search & browse",
  description:
    "Browse FDA food, drug, medical device, and supplement recalls and NHTSA vehicle safety recalls in one place. Public data with summaries and links to official FDA.gov and NHTSA.gov notices.",
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

export default function HomePage() {
  return (
    <div className="homepage">
      <header className="site-header">
        <h1 className="site-title">
          <Link href="/">RecallsAtlas</Link>
        </h1>
      </header>

      <main className="main-content landing-main">
        <section className="hero">
          <h2>Recall Data</h2>
          <p className="hero-lead">Choose a category to search and browse recalls.</p>
        </section>

        <section className="recall-choices">
          <Link href="/recalls" className="recall-choice-card recall-choice-fda">
            <span className="recall-choice-icon" aria-hidden="true">FDA</span>
            <h3>FDA Recalls</h3>
            <p>Drugs, food, medical devices, supplements</p>
          </Link>
          <Link href="/recalls/vehicles" className="recall-choice-card recall-choice-vehicles">
            <span className="recall-choice-icon" aria-hidden="true">NHTSA</span>
            <h3>Vehicle Recalls</h3>
            <p>Cars, trucks, motorcycles</p>
          </Link>
        </section>

        <section className="home-intro" aria-labelledby="home-intro-heading">
          <h2 id="home-intro-heading" className="home-intro-heading">
            About RecallsAtlas
          </h2>
          <p>
            RecallsAtlas brings together public recall information from the U.S. Food and Drug
            Administration (FDA) and the National Highway Traffic Safety Administration (NHTSA).
            Whether you are checking a medication, food product, medical device, dietary supplement,
            or a car or truck, you can start here and follow through to the official government
            notice for full details.
          </p>
          <p>
            The FDA side covers drugs, foods, medical devices, cosmetics, and related products.
            The vehicle side reflects NHTSA safety recalls and defects for passenger vehicles and
            related equipment. Summaries on this site are for quick orientation; always confirm
            lot numbers, dates, and instructions on the FDA or NHTSA source linked from each recall.
          </p>
          <p>
            Our aim is to simplify how you find recalls—clear layouts, plain language where possible,
            and pages you can skim quickly. We are also improving accessibility (WCAG-minded patterns,
            keyboard navigation, and readable contrast) and expanding support to{" "}
            <strong>more than 15 languages</strong> so recall information is easier to use for more
            people worldwide. Those pieces are in active development.
          </p>
          <p>
            RecallsAtlas is an independent aggregator and is not affiliated with or endorsed by
            the FDA or NHTSA. Data is compiled from public feeds and pages for informational
            purposes.
          </p>
        </section>
      </main>
    </div>
  );
}
