"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/recalls", label: "FDA Recalls" },
  { href: "/about",   label: "About" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sitenav${scrolled ? " sitenav--scrolled" : ""}`}
      role="banner"
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="sitenav-inner">
        {/* Brand */}
        <Link href="/" className="sitenav-brand" aria-label="RecallsAtlas — home">
          <span className="sitenav-brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2L2 19h20L12 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="rgba(255,255,255,0.15)"
              />
              <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
          </span>
          <span className="sitenav-brand-text">RecallsAtlas</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="sitenav-links" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
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

        {/* CTA button */}
        <Link href="/recalls" className="sitenav-cta" aria-label="Browse all recalls">
          Browse Recalls
        </Link>

        {/* Mobile hamburger */}
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

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          id="sitenav-mobile-menu"
          className="sitenav-mobile"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
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
          <Link
            href="/recalls"
            className="sitenav-mobile-cta"
            onClick={() => setMenuOpen(false)}
          >
            Browse Recalls
          </Link>
        </nav>
      )}
    </header>
  );
}
