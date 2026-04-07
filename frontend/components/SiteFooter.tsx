"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOOTER_COPY } from "@/lib/footerCopy";
import { parseLangFromPathname, withLangPath } from "@/lib/siteLocale";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const pathname = usePathname() || "/";
  const lang = parseLangFromPathname(pathname);
  const t = FOOTER_COPY[lang];
  const aboutHref = withLangPath("/about", lang);
  const privacyHref = withLangPath("/privacy", lang);

  return (
    <footer className="site-footer">
      <p className="site-footer-copy">
        &copy; {year} Recalls Atlas. {t.copyright}
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
      <div className="site-footer-disclaimer">
        <p>{t.disclaimerP1}</p>
        <p>{t.disclaimerP2}</p>
      </div>
    </footer>
  );
}
