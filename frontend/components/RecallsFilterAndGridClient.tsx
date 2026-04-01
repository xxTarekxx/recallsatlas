"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RecallsListClient from "@/components/RecallsListClient";
import SearchSuggest from "@/components/SearchSuggest";
import { NAV_COPY } from "@/lib/navCopy";
import {
  FILTER_BAR_CATEGORY_SLUGS,
  getRecallsFilterBarUi,
} from "@/lib/recallsFilterBarUi";
import { isValidCategorySlug } from "@/lib/recallCategoryFilter";
import {
  isRtlUiLang,
  recallsListPathWithQuery,
  withLangPath,
  type SiteUiLang,
} from "@/lib/siteLocale";

type Props = {
  lang: SiteUiLang;
  initialCategory?: string;
  initialQuery?: string;
};

function normalizeCategory(raw: string | undefined): string {
  const n = (raw || "").trim().toLowerCase();
  return isValidCategorySlug(n) ? n : "";
}

/**
 * Filter bar + recalls grid: category pills update the grid in place (no navigation).
 */
export default function RecallsFilterAndGridClient({
  lang,
  initialCategory,
  initialQuery,
}: Props) {
  const [category, setCategory] = useState(() => normalizeCategory(initialCategory));

  useEffect(() => {
    setCategory(normalizeCategory(initialCategory));
  }, [initialCategory]);

  const fb = getRecallsFilterBarUi(lang);
  const t = NAV_COPY[lang];
  const pageDir = isRtlUiLang(lang) ? "rtl" : "ltr";
  const recallsAction = recallsListPathWithQuery(lang, category ? { category } : {});
  const recallsDetailBase = withLangPath("/recalls", lang);
  const carsHref = withLangPath("/cars", lang);

  return (
    <>
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
          initialQuery={initialQuery}
        />
        <span className="filter-bar-divider" aria-hidden="true">
          |
        </span>
        <div className="filter-bar-categories" role="group">
          {FILTER_BAR_CATEGORY_SLUGS.map(({ slug, field }) => (
            <button
              key={slug}
              type="button"
              className={`filter-bar-pill${
                category === slug ? " filter-bar-pill--active" : ""
              }`}
              aria-pressed={category === slug}
              onClick={() =>
                setCategory((c) => (c === slug ? "" : slug))
              }
            >
              {fb[field]}
            </button>
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
      <RecallsListClient uiLang={lang} activeCategory={category} />
    </>
  );
}
