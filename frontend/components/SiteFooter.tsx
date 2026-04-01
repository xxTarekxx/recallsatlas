"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseLangFromPathname, withLangPath } from "@/lib/siteLocale";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const pathname = usePathname() || "/";
  const lang = parseLangFromPathname(pathname);
  const aboutHref = withLangPath("/about", lang);
  const privacyHref = withLangPath("/privacy", lang);

  return (
    <footer className="site-footer">
      <p className="site-footer-copy">
        &copy; {year} Recalls Atlas. Recall data aggregated for public use.
      </p>
      <nav className="site-footer-nav" aria-label="Footer navigation">
        <Link href={aboutHref} className="site-footer-link">
          About
        </Link>
        <span className="site-footer-nav-sep" aria-hidden="true">
          ·
        </span>
        <Link href={privacyHref} className="site-footer-link">
          Privacy Policy
        </Link>
        <span className="site-footer-nav-sep" aria-hidden="true">
          ·
        </span>
        <a
          href="mailto:contact@recallsatlas.com"
          className="site-footer-link"
        >
          Contact
        </a>
      </nav>
      <p className="site-footer-disclaimer">
        All recall information on recallsatlas.com is aggregated from the U.S.
        Food &amp; Drug Administration (FDA) and the National Highway Traffic
        Safety Administration (NHTSA) and is provided for informational purposes
        only. Recalls Atlas is not affiliated with or endorsed by the FDA or
        NHTSA. Any translations are AI-generated and may not be 100% accurate —
        always verify recall details directly with the official source. To
        confirm recall information, contact the FDA at{" "}
        <a
          href="tel:+18884636332"
          className="site-footer-link"
        >
          888-463-6332
        </a>{" "}
        or visit{" "}
        <a
          href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
          target="_blank"
          rel="noopener noreferrer"
          className="site-footer-link"
        >
          FDA.gov
        </a>
        . Recalls Atlas is not responsible for any decisions made based on
        information found on this site.
      </p>
    </footer>
  );
}
