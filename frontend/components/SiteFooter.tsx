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
  const methodologyHref = withLangPath("/methodology", lang);
  const guideHref = withLangPath("/how-to-check-recalls", lang);
  const privacyHref = withLangPath("/privacy", lang);
  const contactHref = withLangPath("/contact", lang);

  const links = [
    { href: aboutHref, label: "About" },
    { href: methodologyHref, label: "Methodology" },
    { href: guideHref, label: "Recall Guide" },
    { href: privacyHref, label: "Privacy Policy" },
    { href: contactHref, label: "Contact" },
  ];

  return (
    <footer className="site-footer">
      <p className="site-footer-copy">
        &copy; {year} Recalls Atlas. {t.copyright}
      </p>
      <nav className="site-footer-nav" aria-label="Footer navigation">
        {links.map((link, index) => (
          <span key={link.href} className="site-footer-nav-item">
            {index > 0 ? (
              <span className="site-footer-nav-sep" aria-hidden="true">
                &middot;
              </span>
            ) : null}
            <Link href={link.href} className="site-footer-link">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
      <div className="site-footer-disclaimer">
        <p>{t.disclaimerP1}</p>
        <p>{t.disclaimerP2}</p>
      </div>
    </footer>
  );
}
