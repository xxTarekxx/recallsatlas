import Link from "next/link";
import { Suspense } from "react";
import RecallsListClient from "@/components/RecallsListClient";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import SearchSuggest from "@/components/SearchSuggest";
import { NAV_COPY } from "@/lib/navCopy";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

const CATEGORIES = ["Drugs", "Food", "Medical Devices", "Supplements"];

export default function RecallsSearchPage({ lang }: { lang: SiteUiLang }) {
  const t = NAV_COPY[lang];
  const recallsAction = withLangPath("/recalls", lang);
  const carsHref = withLangPath("/cars", lang);
  const homeHref = withLangPath("/", lang);

  return (
    <div className="recalls-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content" style={{ overflow: "visible" }}>
        <h1>{t.fda}</h1>
        <section className="filter-bar">
          <SearchSuggest
            action={recallsAction}
            vehicleSearchUrl={carsHref}
            vehicleSearchHint={t.cars}
            wrapperClassName="filter-bar-search"
            inputClassName="search-input"
            buttonClassName="search-btn"
            placeholder="Search headline or product type..."
            ariaLabel="Search recalls"
          />
          <span className="filter-bar-divider" aria-hidden="true">
            |
          </span>
          <div className="filter-bar-categories">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={withLangPath(
                  `/category/${cat.toLowerCase().replace(/\s+/g, "-")}`,
                  lang
                )}
                className="filter-bar-pill"
              >
                {cat}
              </Link>
            ))}
          </div>
          <span className="filter-bar-divider" aria-hidden="true">
            |
          </span>
          <Link href={withLangPath("/brand", lang)} className="filter-bar-link">
            Brands
          </Link>
          <span className="filter-bar-divider" aria-hidden="true">
            |
          </span>
          <Link href={withLangPath("/year", lang)} className="filter-bar-link">
            Year
          </Link>
        </section>
        <Suspense fallback={<p className="placeholder-note">Loading recalls…</p>}>
          <RecallsListClient uiLang={lang} />
        </Suspense>
      </main>
    </div>
  );
}
