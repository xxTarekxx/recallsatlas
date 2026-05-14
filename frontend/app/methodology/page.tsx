import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Methodology - Recalls Atlas",
  description:
    "How Recalls Atlas sources, structures, summarizes, and updates FDA, NHTSA, and CPSC recall information.",
  alternates: { canonical: `${siteUrl}/methodology` },
};

export default function MethodologyPage() {
  return (
    <div className="policy-page">
      <main className="main-content policy-main">
        <article className="policy-article">
          <h1 className="policy-heading">Methodology</h1>
          <p className="policy-meta">How Recalls Atlas builds recall pages</p>

          <section className="about-section">
            <h2 className="about-section-heading">Official source first</h2>
            <p>
              Recalls Atlas uses public recall information from official U.S.
              agencies: FDA notices for food, drug, medical device, and dietary
              supplement recalls; NHTSA vehicle safety recall filings; and CPSC
              consumer product recall announcements. Recall detail pages are
              designed to help readers find the affected product, understand
              the risk, and reach the original agency notice.
            </p>
            <p>
              Each recall page keeps the official source link visible so readers
              can verify the notice directly with the agency or recalling
              company. Recalls Atlas is independent and is not endorsed by FDA,
              NHTSA, CPSC, or any manufacturer.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-heading">Structured summaries</h2>
            <p>
              We reorganize public recall data into consistent sections such as
              affected products, recall reason, consumer risk, remedy, contact
              information, and source details. The goal is to reduce friction for
              readers without changing the underlying facts reported by the
              agency.
            </p>
            <p>
              Where agency records contain missing fields, unclear wording, or
              incomplete dates, Recalls Atlas avoids inventing details. Those
              pages still point readers back to the original government notice
              for the definitive record.
            </p>
          </section>

          <section className="about-section">
            <h2 className="about-section-heading">Updates and corrections</h2>
            <p>
              Recall data is refreshed as new public records are added or source
              data changes. If a reader notices a mismatch, outdated page, or
              formatting issue, they can send the page URL and correction note
              to contact@recallsatlas.com for review.
            </p>
            <p>
              Recalls Atlas does not provide medical, legal, automotive, or
              product safety advice. For urgent safety questions, readers should
              follow the instructions in the official recall notice and contact
              the agency, manufacturer, retailer, or healthcare professional as
              appropriate.
            </p>
          </section>

          <p>
            Learn more about the site on the{" "}
            <Link href="/about">About Recalls Atlas</Link> page.
          </p>
        </article>
      </main>
    </div>
  );
}
