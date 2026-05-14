import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "Contact Recalls Atlas",
  description:
    "Contact Recalls Atlas for site feedback, correction requests, source questions, and accessibility issues.",
  alternates: { canonical: `${siteUrl}/contact` },
};

export default function ContactPage() {
  return (
    <div className="policy-page">
      <main className="main-content policy-main">
        <article className="policy-article">
          <h1 className="policy-heading">Contact Recalls Atlas</h1>
          <p className="policy-meta">Corrections, feedback, and site questions</p>

          <p>
            Recalls Atlas is an independent public-information site. We welcome
            corrections, source questions, accessibility reports, and feedback
            about how recall pages are organized.
          </p>

          <h2>What to send</h2>
          <p>
            For the fastest review, include the Recalls Atlas page URL, the
            official source URL if you have it, and a short explanation of what
            should be checked. We review correction requests against the official
            FDA, NHTSA, or CPSC source before updating a page.
          </p>

          <h2>Email</h2>
          <p>
            Email:{" "}
            <a href="mailto:contact@recallsatlas.com">
              contact@recallsatlas.com
            </a>
          </p>

          <h2>Important safety note</h2>
          <p>
            Recalls Atlas cannot confirm whether your specific product is
            affected and cannot provide medical, legal, vehicle repair, refund,
            or product safety advice. For a specific recall, use the contact
            information in the official notice or contact the manufacturer,
            retailer, agency, dealer, or healthcare professional as appropriate.
          </p>

          <p>
            Read more about our source process on the{" "}
            <Link href="/methodology">Methodology</Link> page.
          </p>
        </article>
      </main>
    </div>
  );
}
