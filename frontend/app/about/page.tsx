import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About RecallsAtlas – Independent FDA Recall Aggregator",
  description:
    "RecallsAtlas is an independent aggregator of FDA and NHTSA recall data. Learn about our mission, data sources, and how to contact us.",
  alternates: { canonical: "https://recallsatlas.com/about" },
};

export default function AboutPage() {
  return (
    <div className="policy-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>

      <main className="main-content policy-main">
        <article className="policy-article">
          <h1 className="policy-heading">About RecallsAtlas</h1>

          <h2>What is RecallsAtlas?</h2>
          <p>
            RecallsAtlas is an independent public-interest website that
            aggregates product recall notices published by the U.S. Food &amp;
            Drug Administration (FDA). Our goal is to make recall information
            easier to search, browse, and understand — in plain language and
            across multiple languages.
          </p>
          <p>
            We are not affiliated with, endorsed by, or sponsored by the FDA,
            the National Highway Traffic Safety Administration (NHTSA), or any
            other government agency. All recall data originates from official
            government sources and is reproduced here for informational purposes
            only.
          </p>

          <h2>Our Data Sources</h2>
          <p>
            All FDA recall information displayed on this site is sourced
            directly from the official FDA Recalls, Market Withdrawals &amp;
            Safety Alerts database at{" "}
            <a
              href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
              target="_blank"
              rel="noopener noreferrer"
            >
              FDA.gov
            </a>
            . Data is updated regularly to reflect new recalls and changes to
            existing ones, including terminations.
          </p>
          <p>
            Vehicle recall data from NHTSA is planned for a future update.
          </p>

          <h2>Accuracy &amp; Translations</h2>
          <p>
            While we strive to present accurate recall information, RecallsAtlas
            is not a substitute for official government sources. Recall details
            — including product descriptions, reasons for recall, affected lots,
            and contact information — are reproduced from FDA notices and may
            have been summarized or reformatted for readability.
          </p>
          <p>
            Translations into languages other than English are generated using
            AI and may not be 100% accurate. Always verify critical recall
            information directly with the FDA:
          </p>
          <ul>
            <li>
              Phone:{" "}
              <a href="tel:18002679675">1-800-267-9675</a>
            </li>
            <li>
              Website:{" "}
              <a
                href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
                target="_blank"
                rel="noopener noreferrer"
              >
                FDA.gov Recalls
              </a>
            </li>
          </ul>

          <h2>Accessibility</h2>
          <p>
            RecallsAtlas is built with accessibility in mind. We aim to conform
            to WCAG 2.1 Level AA guidelines so that recall information is
            available to all users, including those using assistive technologies.
            If you encounter an accessibility issue, please let us know using
            the contact details below.
          </p>

          <h2>Contact Us</h2>
          <p>
            For questions, feedback, corrections, or accessibility concerns,
            please email us at{" "}
            <a href="mailto:contact@recallsatlas.com">
              contact@recallsatlas.com
            </a>
            .
          </p>
          <p>
            If you believe a recall is incorrectly listed or missing from our
            database, please include the FDA recall number or a link to the
            official FDA notice in your message.
          </p>

          <h2>Legal</h2>
          <p>
            For information on how we handle data and cookies, please read our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <p>
            RecallsAtlas is not responsible for any decisions made based on
            information found on this site. Always verify recall information
            with the official issuing authority before taking action.
          </p>
        </article>
      </main>
    </div>
  );
}
