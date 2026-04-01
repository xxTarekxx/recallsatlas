import Link from "next/link";
import { Suspense } from "react";
import RecallsListClient from "@/components/RecallsListClient";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import SearchSuggest from "@/components/SearchSuggest";
import { NAV_COPY } from "@/lib/navCopy";
import {
  FILTER_BAR_CATEGORY_SLUGS,
  getRecallsFilterBarUi,
} from "@/lib/recallsFilterBarUi";
import { isRtlUiLang, withLangPath, type SiteUiLang } from "@/lib/siteLocale";

export default function RecallsSearchPage({ lang }: { lang: SiteUiLang }) {
  const t = NAV_COPY[lang];
  const fb = getRecallsFilterBarUi(lang);
  const recallsAction = withLangPath("/recalls", lang);
  const recallsDetailBase = recallsAction;
  const carsHref = withLangPath("/cars", lang);
  const homeHref = withLangPath("/", lang);
  const pageDir = isRtlUiLang(lang) ? "rtl" : "ltr";

  return (
    <div className="recalls-page" dir={pageDir} lang={lang}>
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content" style={{ overflow: "visible" }} dir={pageDir} lang={lang}>
        <h1>{t.fda}</h1>
        <section className="filter-bar" dir={pageDir} lang={lang}>
          <SearchSuggest
            action={recallsAction}
            recallsDetailBase={recallsDetailBase}
            vehicleSearchUrl={carsHref}
            vehicleSearchHint={t.cars}
            vehicleSearchMeta={fb.vinMeta}
            wrapperClassName="filter-bar-search"
            inputClassName="search-input"
            buttonClassName="search-btn"
            placeholder={fb.searchPlaceholder}
            ariaLabel={fb.searchAriaLabel}
            buttonLabel={fb.searchButton}
            loadingLabel={fb.loadingSuggestions}
            suggestionsAriaLabel={fb.suggestionsAriaLabel}
            fieldSrLabel={fb.searchFieldSrLabel}
            submitAriaLabel={fb.searchSubmitAriaLabel}
            inputDir="auto"
          />
          <span className="filter-bar-divider" aria-hidden="true">
            |
          </span>
          <div className="filter-bar-categories">
            {FILTER_BAR_CATEGORY_SLUGS.map(({ slug, field }) => (
              <Link
                key={slug}
                href={withLangPath(`/category/${slug}`, lang)}
                className="filter-bar-pill"
              >
                {fb[field]}
              </Link>
            ))}
          </div>
          <span className="filter-bar-divider" aria-hidden="true">
            |
          </span>
          <Link href={withLangPath("/brand", lang)} className="filter-bar-link">
            {fb.brands}
          </Link>
          <span className="filter-bar-divider" aria-hidden="true">
            |
          </span>
          <Link href={withLangPath("/year", lang)} className="filter-bar-link">
            {fb.year}
          </Link>
        </section>
        <Suspense fallback={<p className="placeholder-note">{fb.loadingRecallsList}</p>}>
          <RecallsListClient uiLang={lang} />
        </Suspense>
      </main>
    </div>
  );
}
