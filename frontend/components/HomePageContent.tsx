import Link from "next/link";
import SearchSuggest from "@/components/SearchSuggest";
import { HOME_COPY } from "@/lib/homeCopy";
import { getRecallsFilterBarUi } from "@/lib/recallsFilterBarUi";
import { isRtlUiLang, withLangPath, type SiteUiLang } from "@/lib/siteLocale";

type Props = {
  lang: SiteUiLang;
  recallsCountText: string;
};

export default function HomePageContent({ lang, recallsCountText }: Props) {
  const t = HOME_COPY[lang];
  const fb = getRecallsFilterBarUi(lang);
  const recallsAction = withLangPath("/recalls", lang);
  const carsHref = withLangPath("/cars", lang);
  const heroDir = isRtlUiLang(lang) ? "rtl" : "ltr";

  return (
    <div className="homepage">
      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="home-hero-inner" dir={heroDir} lang={lang}>
          <div className="home-hero-badges">
            <div className="home-hero-badge" aria-label="FDA">
              <span className="home-hero-badge-dot" aria-hidden="true" />
              {t.badge}
            </div>
            <div className="home-hero-badge home-hero-badge--nhtsa" aria-label="NHTSA">
              <span
                className="home-hero-badge-dot home-hero-badge-dot--nhtsa"
                aria-hidden="true"
              />
              {t.badgeNhtsa}
            </div>
          </div>

          <h1 id="hero-heading" className="home-hero-title">
            {t.heroLine1}
            <br />
            <span>{t.heroLine2}</span>
          </h1>

          <p className="home-hero-subtitle">{t.heroSub}</p>

          <div className="home-hero-quick">
            <Link className="home-hero-quick-link" href={recallsAction}>
              {t.heroQuickFda}
            </Link>
            <span className="home-hero-quick-sep" aria-hidden="true">
              ·
            </span>
            <Link className="home-hero-quick-link" href={carsHref}>
              {t.heroQuickVehicle}
            </Link>
          </div>

          <SearchSuggest
            action={recallsAction}
            recallsDetailBase={recallsAction}
            vehicleSearchUrl={carsHref}
            vehicleSearchHint={t.heroQuickVehicle}
            vehicleSearchMeta={fb.vinMeta}
            wrapperClassName="home-hero-search"
            inputClassName="home-hero-search-input"
            buttonClassName="home-hero-search-btn"
            placeholder={fb.searchPlaceholder}
            ariaLabel={fb.searchAriaLabel}
            buttonLabel={fb.searchButton}
            loadingLabel={fb.loadingSuggestions}
            suggestionsAriaLabel={fb.suggestionsAriaLabel}
            fieldSrLabel={fb.searchFieldSrLabel}
            submitAriaLabel={fb.searchSubmitAriaLabel}
            inputDir="auto"
          />

          <div className="home-stats" aria-label="Site statistics">
            <div className="home-stat">
              <span className="home-stat-value">{recallsCountText}</span>
              <span className="home-stat-label">{t.statRecalls}</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">FDA</span>
              <span className="home-stat-label">{t.statSource}</span>
            </div>
            <div className="home-stat" title="More than 11 languages">
              <span className="home-stat-value">11+</span>
              <span className="home-stat-label">{t.statLangs}</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">Free</span>
              <span className="home-stat-label">{t.statFree}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-categories" aria-labelledby="categories-heading">
        <p className="home-section-label" aria-hidden="true">
          {t.sectionBrowse}
        </p>
        <h2 id="categories-heading" className="home-section-title">
          {t.sectionChoose}
        </h2>

        <div className="home-category-grid">
          <Link
            href={withLangPath("/recalls", lang)}
            className="home-category-card"
            aria-label={t.fdaTitle}
          >
            <span className="home-category-icon home-category-icon--fda" aria-hidden="true">
              FDA
            </span>
            <h3>{t.fdaTitle}</h3>
            <p>{t.fdaBody}</p>
            <span className="home-category-pill" aria-hidden="true">
              {t.fdaCta}
            </span>
          </Link>

          <Link
            href={withLangPath("/cars", lang)}
            className="home-category-card"
            aria-label={t.vehicleTitle}
          >
            <span className="home-category-icon home-category-icon--nhtsa" aria-hidden="true">
              NHTSA
            </span>
            <h3>{t.vehicleTitle}</h3>
            <p>{t.vehicleBody}</p>
            <span className="home-category-pill" aria-hidden="true">
              {t.vehicleCta}
            </span>
          </Link>
        </div>
      </section>

      <section className="home-about" aria-labelledby="about-heading">
        <div className="home-about-inner">
          <p className="home-section-label" aria-hidden="true">
            {t.aboutKicker}
          </p>
          <h2 id="about-heading" className="home-section-title">
            {t.aboutTitle}
          </h2>
          <p>{t.aboutP1}</p>
          <p>{t.aboutP2}</p>
          <p>
            {t.aboutP3Start}
            <strong>{t.aboutP3Strong}</strong>
            {t.aboutP3End}
            <Link href={withLangPath("/about", lang)}>{t.aboutLink}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
