import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: "How to Check Product Recalls",
  description:
    "A practical guide to checking food, drug, vehicle, and consumer product recalls using official FDA, NHTSA, CPSC, and Recalls Atlas pages.",
  alternates: { canonical: `${siteUrl}/how-to-check-recalls` },
};

export default function HowToCheckRecallsPage() {
  return (
    <div className="policy-page">
      <main className="main-content policy-main">
        <article className="policy-article">
          <h1 className="policy-heading">How to check if a product was recalled</h1>
          <p className="policy-meta">
            Practical steps for reading recall notices and verifying details
          </p>

          <p>
            Recall notices can be dense because they are written to preserve
            exact product, lot, date, model, and remedy details. Recalls Atlas
            organizes those details into searchable pages, but the official
            agency notice remains the final source for any safety decision.
          </p>

          <h2>1. Match the product, not just the brand</h2>
          <p>
            A recall may affect one product line, package size, model, lot code,
            production date, UPC, VIN range, or manufacturing window while other
            products from the same brand are not included. Compare the exact
            product name and identifiers on your item with the recall notice.
          </p>

          <h2>2. Check the agency source</h2>
          <p>
            FDA notices usually cover food, drugs, medical devices, cosmetics,
            and dietary supplements. NHTSA notices cover vehicle safety
            campaigns and VIN-based recall checks. CPSC notices cover consumer
            products such as toys, appliances, electronics, furniture, sports
            equipment, and household goods.
          </p>

          <h2>3. Read the remedy carefully</h2>
          <p>
            The remedy may ask consumers to stop using the product, return it,
            request a repair kit, contact the company, check a lot number, or
            schedule service. Follow the remedy in the official notice because
            the correct action can vary even when two recalls look similar.
          </p>

          <h2>4. Save proof and contact the right party</h2>
          <p>
            If the notice lists a phone number, email, form, dealer, retailer,
            or manufacturer contact, use that channel. Keep photos of labels,
            package codes, receipts, VINs, model plates, and any confirmation
            messages until the remedy is complete.
          </p>

          <h2>5. Use Recalls Atlas as a starting point</h2>
          <p>
            You can search FDA recall pages, check vehicle recall information,
            and browse CPSC consumer product notices from the site navigation.
            Each detail page is designed to help you find the official source
            and the product identifiers that matter most.
          </p>

          <p>
            Start with <Link href="/recalls">FDA recalls</Link>,{" "}
            <Link href="/cars">vehicle recalls</Link>, or{" "}
            <Link href="/general-recalls">consumer product recalls</Link>.
          </p>
        </article>
      </main>
    </div>
  );
}
