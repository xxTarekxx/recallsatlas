"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";

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
        <SiteBrandLogoLink linkClassName="sitenav-brand" imgClassName="sitenav-brand-logo" />

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
        </nav>
      )}
    </header>
  );
}
