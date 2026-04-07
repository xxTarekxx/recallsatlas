"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BREADCRUMB_UI,
  buildBreadcrumbTrail,
} from "@/lib/siteBreadcrumbs";
import { isRtlUiLang, parseLangFromPathname, type SiteUiLang } from "@/lib/siteLocale";

export default function SiteBreadcrumbs() {
  const pathname = usePathname() || "/";
  const lang: SiteUiLang = parseLangFromPathname(pathname);
  const strings = BREADCRUMB_UI[lang] ?? BREADCRUMB_UI.en;
  const items = buildBreadcrumbTrail(pathname, lang, strings);
  if (items.length < 2) return null;

  const dir = isRtlUiLang(lang) ? "rtl" : "ltr";

  return (
    <div className="site-breadcrumbs-wrap" dir={dir}>
      <nav className="site-breadcrumbs" aria-label="Breadcrumb">
        <ol className="site-breadcrumbs-list">
          {items.map((item, i) => (
            <li key={`${item.href}-${i}`} className="site-breadcrumbs-li">
              {item.current ? (
                <span className="site-breadcrumbs-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="site-breadcrumbs-link">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
