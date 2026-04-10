import { Suspense } from "react";
import SearchSuggest from "@/components/recallcommon/SearchSuggest";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import type { GeneralRecallListPage } from "@/lib/general-recalls-data";
import { GENERAL_RECALLS_SEARCH_UI } from "@/lib/generalRecallsSearchUi";
import { HOME_COPY } from "@/lib/homeCopy";
import {
  generalRecallsListPathWithQuery,
  isRtlUiLang,
  withLangPath,
  type SiteUiLang,
} from "@/lib/siteLocale";
import GeneralRecallsListClient from "./GeneralRecallsListClient";

type Props = {
  lang: SiteUiLang;
  initialQuery?: string;
  initialData?: GeneralRecallListPage;
};

export default function GeneralRecallsSearchPage({ lang, initialQuery, initialData }: Props) {
  const t = HOME_COPY[lang];
  const sui = GENERAL_RECALLS_SEARCH_UI[lang];
  const homeHref = withLangPath("/", lang);
  const pageDir = isRtlUiLang(lang) ? "rtl" : "ltr";
  const listAction = generalRecallsListPathWithQuery(lang, {});

  return (
    <div className="recalls-page" dir={pageDir} lang={lang}>
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content" style={{ overflow: "visible" }} dir={pageDir} lang={lang}>
        <h1>{t.generalTitle}</h1>
        <p className="recalls-page-intro" style={{ color: "#64748b", marginBottom: "1.25rem", maxWidth: "42rem" }}>
          {t.generalBody}
        </p>

        <section className="filter-bar" dir={pageDir} lang={lang}>
          <SearchSuggest
            action={listAction}
            recallsDetailBase={withLangPath("/general-recalls", lang)}
            suggestApiPath={`/api/general-recalls/suggest?lang=${encodeURIComponent(lang)}`}
            wrapperClassName="filter-bar-search"
            inputClassName="search-input"
            buttonClassName="search-btn"
            placeholder={sui.searchPlaceholder}
            ariaLabel={sui.searchAriaLabel}
            buttonLabel={sui.searchButton}
            loadingLabel={sui.loadingSuggestions}
            suggestionsAriaLabel={sui.suggestionsAriaLabel}
            fieldSrLabel={sui.searchFieldSrLabel}
            submitAriaLabel={sui.searchSubmitAriaLabel}
            inputDir="auto"
            initialQuery={initialQuery}
          />
        </section>

        <Suspense fallback={<p className="placeholder-note">{sui.loadingList}</p>}>
          <GeneralRecallsListClient uiLang={lang} initialData={initialData} />
        </Suspense>
      </main>
    </div>
  );
}
