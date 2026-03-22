import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – RecallsAtlas",
  description:
    "RecallsAtlas Privacy Policy. Learn how we collect, use, and protect your information when you visit RecallsAtlas.com.",
  alternates: { canonical: "https://recallsatlas.com/privacy" },
};

export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear();

  return (
    <div className="policy-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>

      <main className="main-content policy-main">
        <article className="policy-article">
          <h1 className="policy-heading">Privacy Policy</h1>
          <p className="policy-meta">Effective date: January 1, {year}</p>

          <p>
            RecallsAtlas ("we," "us," or "our") operates RecallsAtlas.com (the
            "Site"). This Privacy Policy explains what information we collect
            when you visit the Site, how we use it, and your rights regarding
            that information. By using the Site you agree to this policy.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>Usage data collected automatically</h3>
          <p>
            When you browse the Site, our servers and third-party analytics
            providers may automatically collect standard log data, including
            your IP address (anonymized where possible), browser type, operating
            system, referring URL, pages viewed, and the date and time of your
            visit. We use this data solely to understand how the Site is used
            and to improve its performance.
          </p>
          <h3>Cookies and similar technologies</h3>
          <p>
            The Site uses cookies — small text files stored on your device — and
            similar tracking technologies for the following purposes:
          </p>
          <ul>
            <li>
              <strong>Essential cookies</strong> — required for core site
              functionality (e.g., remembering your preferences within a
              session).
            </li>
            <li>
              <strong>Analytics cookies</strong> — help us understand aggregate
              traffic patterns (e.g., Google Analytics).
            </li>
            <li>
              <strong>Advertising cookies</strong> — if advertising is enabled,
              third-party ad networks such as Google AdSense may place cookies
              on your device to serve personalized ads based on your browsing
              history. See "Third-Party Advertising" below.
            </li>
          </ul>
          <p>
            You can disable cookies through your browser settings at any time.
            Disabling cookies may affect some Site functionality.
          </p>

          <h2>2. Third-Party Advertising</h2>
          <p>
            RecallsAtlas may display advertisements served by Google AdSense
            and other third-party ad networks. These networks may use cookies
            and web beacons to collect information about your visits to this and
            other websites in order to display relevant advertisements. Google's
            use of advertising cookies is governed by the{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Privacy Policy
            </a>
            . You can opt out of personalized advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ads Settings
            </a>{" "}
            or{" "}
            <a
              href="https://optout.aboutads.info/"
              target="_blank"
              rel="noopener noreferrer"
            >
              aboutads.info
            </a>
            .
          </p>

          <h2>3. Analytics</h2>
          <p>
            We use Google Analytics to collect aggregated, anonymized data about
            how visitors use the Site. Google Analytics does not identify
            individual users. You can opt out of Google Analytics tracking by
            installing the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>

          <h2>4. How We Use Information</h2>
          <p>We use the information collected to:</p>
          <ul>
            <li>Operate, maintain, and improve the Site</li>
            <li>Understand aggregate usage patterns and popular content</li>
            <li>Serve relevant advertisements (if advertising is enabled)</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            We do not sell, rent, or trade your personal information to third
            parties.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            Server log data is typically retained for up to 90 days. Analytics
            data is retained in aggregated, anonymized form indefinitely. We do
            not collect personally identifiable information such as your name,
            email address, or payment details unless you contact us directly.
          </p>

          <h2>6. Children's Privacy</h2>
          <p>
            The Site is not directed to children under the age of 13. We do not
            knowingly collect personal information from children. If you believe
            we have inadvertently collected information from a child, please
            contact us and we will promptly delete it.
          </p>

          <h2>7. Links to External Sites</h2>
          <p>
            The Site contains links to FDA.gov, NHTSA.gov, and other official
            government sources. These sites have their own privacy policies and
            we are not responsible for their content or practices.
          </p>

          <h2>8. Your Rights</h2>
          <p>
            Depending on where you reside, you may have rights including access
            to, correction of, or deletion of personal data we hold about you.
            To exercise these rights, or if you have any questions about this
            policy, please contact us at the address listed on our{" "}
            <Link href="/about">About page</Link>.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated effective date. Continued use of
            the Site after changes are posted constitutes your acceptance of the
            updated policy.
          </p>

          <h2>10. Contact</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy,
            please visit our{" "}
            <Link href="/about">About &amp; Contact page</Link> or email us
            directly at the address listed there.
          </p>
        </article>
      </main>
    </div>
  );
}
