"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import NavLanguageSelect from "@/components/NavLanguageSelect";
import { NAV_COPY } from "@/lib/navCopy";
import {
  isRtlUiLang,
  parseLangFromPathname,
  withLangPath,
} from "@/lib/siteLocale";

export default function SiteNav() {
  const pathname = usePathname() || "/";
  const lang = parseLangFromPathname(pathname);
  const t = NAV_COPY[lang];
  const homeHref = withLangPath("/", lang);

  const links = [
    { href: withLangPath("/recalls", lang), label: t.fda },
    { href: withLangPath("/cars", lang), label: t.cars },
    { href: withLangPath("/about", lang), label: t.about },
  ];

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navDir = isRtlUiLang(lang) ? "rtl" : "ltr";

  return (
    <header
      className={`sitenav${scrolled ? " sitenav--scrolled" : ""}`}
      role="banner"
      dir={navDir}
      lang={lang}
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="sitenav-inner">
        <SiteBrandLogoLink href={homeHref} />

        <nav className="sitenav-links" aria-label="Main navigation">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== homeHref && pathname.startsWith(link.href + "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sitenav-link${active ? " sitenav-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="sitenav-tools">
          <NavLanguageSelect />
        </div>

        <button
          className={`sitenav-hamburger${menuOpen ? " sitenav-hamburger--open" : ""}`}
          aria-expanded={menuOpen}
          aria-controls="sitenav-mobile-menu"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((v) => !v)}
          type="button"
        >
          <span className="sitenav-hamburger-bar" />
          <span className="sitenav-hamburger-bar" />
          <span className="sitenav-hamburger-bar" />
        </button>
      </div>

      {menuOpen && (
        <nav
          id="sitenav-mobile-menu"
          className="sitenav-mobile"
          aria-label="Mobile navigation"
        >
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== homeHref && pathname.startsWith(link.href + "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sitenav-mobile-link${active ? " sitenav-mobile-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="sitenav-mobile-lang">
            <NavLanguageSelect />
          </div>
        </nav>
      )}
    </header>
  );
}
