"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import NavLanguageSelect from "@/components/NavLanguageSelect";
import { NAV_COPY } from "@/lib/navCopy";
import {
  isRtlUiLang,
  parseLangFromPathname,
  withLangPath,
} from "@/lib/siteLocale";

type MobileMenuState = "closed" | "open" | "closing-dismiss" | "closing-nav";

export default function SiteNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const lang = parseLangFromPathname(pathname);
  const t = NAV_COPY[lang];
  const homeHref = withLangPath("/", lang);

  const links = [
    { href: withLangPath("/recalls", lang), label: t.fda },
    { href: withLangPath("/cars", lang), label: t.cars },
    { href: withLangPath("/general-recalls", lang), label: t.consumerRecalls },
    { href: withLangPath("/about", lang), label: t.about },
  ];

  const [mobileMenu, setMobileMenu] = useState<MobileMenuState>("closed");
  const [scrolled, setScrolled] = useState(false);
  const pendingNavHrefRef = useRef<string | null>(null);
  const mobileMenuRef = useRef(mobileMenu);
  mobileMenuRef.current = mobileMenu;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenu("closed");
    pendingNavHrefRef.current = null;
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => {
      if (mq.matches) {
        setMobileMenu("closed");
        pendingNavHrefRef.current = null;
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const open =
      mobileMenu === "open" ||
      mobileMenu === "closing-dismiss" ||
      mobileMenu === "closing-nav";
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenu]);

  useEffect(() => {
    if (mobileMenu !== "open") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenu("closing-dismiss");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenu]);

  const handleMobilePanelAnimEnd = useCallback(
    (e: React.AnimationEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      const s = mobileMenuRef.current;
      if (s === "open") return;
      if (s === "closing-dismiss") {
        setMobileMenu("closed");
        return;
      }
      if (s === "closing-nav") {
        const href = pendingNavHrefRef.current;
        pendingNavHrefRef.current = null;
        if (href) router.push(href);
        setMobileMenu("closed");
      }
    },
    [router],
  );

  const toggleHamburger = () => {
    setMobileMenu((prev) => {
      if (prev === "closed") return "open";
      if (prev === "open") return "closing-dismiss";
      return prev;
    });
  };

  const onMobileNavLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (mobileMenu !== "open") return;
    pendingNavHrefRef.current = href;
    setMobileMenu("closing-nav");
  };

  const menuVisualOpen =
    mobileMenu === "open" ||
    mobileMenu === "closing-dismiss" ||
    mobileMenu === "closing-nav";

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
          className={`sitenav-hamburger${menuVisualOpen ? " sitenav-hamburger--open" : ""}`}
          aria-expanded={menuVisualOpen}
          aria-controls="sitenav-mobile-menu"
          aria-label={menuVisualOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={toggleHamburger}
          type="button"
        >
          <span className="sitenav-hamburger-bar" />
          <span className="sitenav-hamburger-bar" />
          <span className="sitenav-hamburger-bar" />
        </button>
      </div>

      {mobileMenu !== "closed" && (
        <div
          id="sitenav-mobile-menu"
          className={`sitenav-mobile-overlay sitenav-mobile-overlay--${mobileMenu}`}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          dir={navDir}
        >
          <button
            type="button"
            className="sitenav-mobile-backdrop"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() =>
              mobileMenu === "open" && setMobileMenu("closing-dismiss")
            }
          />
          <nav
            className="sitenav-mobile-panel"
            aria-label="Mobile navigation"
            onAnimationEnd={handleMobilePanelAnimEnd}
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
                  onClick={(e) => onMobileNavLinkClick(e, link.href)}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="sitenav-mobile-lang">
              <NavLanguageSelect />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
