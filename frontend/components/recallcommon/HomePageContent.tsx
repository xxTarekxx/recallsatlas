import Link from "next/link";
import { HOME_COPY } from "@/lib/homeCopy";
import { isRtlUiLang, withLangPath, type SiteUiLang } from "@/lib/siteLocale";

type Props = {
  lang: SiteUiLang;
  recallsCountText: string;
  semanticSearchReady?: boolean;
};

const semanticBadges = [
  "AI semantic recall search",
  "FDA + CPSC + NHTSA data",
  "Related recall graph",
  "Source-backed results",
];

const semanticExamples = [
  "battery overheating in children's products",
  "undeclared allergens in snacks",
  "fire hazard from chargers",
  "salmonella contamination",
  "choking hazard in toys",
];

const pipelineSteps = [
  "Raw public data",
  "normalization",
  "embeddings",
  "pgvector search",
  "related recall graph",
];

export default function HomePageContent({
  lang,
  recallsCountText,
  semanticSearchReady = false,
}: Props) {
  const t = HOME_COPY[lang];
  const recallsAction = withLangPath("/recalls", lang);
  const recallGraphHref = "/recallgraph";
  const recallGraphSearchHref = "/recallgraph/search";
  const carsHref = withLangPath("/cars", lang);
  const generalHref = withLangPath("/general-recalls", lang);
  const heroDir = isRtlUiLang(lang) ? "rtl" : "ltr";

  return (
    <div className="homepage">
      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="home-hero-inner" dir={heroDir} lang={lang}>
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-hero-badges">
                {semanticBadges.map((badge, index) => (
                  <div className="home-hero-badge" key={badge}>
                    <span
                      className={`home-hero-badge-dot home-hero-badge-dot--${index + 1}`}
                      aria-hidden="true"
                    />
                    {badge}
                  </div>
                ))}
              </div>

              <h1 id="hero-heading" className="home-hero-title">
                AI Semantic Search for Public Recall Data
              </h1>

              <p className="home-hero-subtitle">
                Find related recalls by hazard pattern, product type, company, ingredient,
                failure mode, or consumer risk, even when the exact words do not match.
              </p>

              <form
                className="home-hero-search"
                action={recallGraphSearchHref}
                method="get"
                role="search"
                aria-label="Search RecallGraph semantic recall data"
              >
                <label htmlFor="home-recallgraph-query" className="sr-only">
                  Search public recall data by meaning, hazard pattern, product type, company, or
                  risk
                </label>
                <input
                  id="home-recallgraph-query"
                  type="search"
                  name="q"
                  className="home-hero-search-input"
                  placeholder="Try: battery overheating in children's products"
                  autoComplete="off"
                  dir="auto"
                />
                <button type="submit" className="home-hero-search-btn">
                  Search by Meaning
                </button>
              </form>

              <div className="home-semantic-examples" aria-label="Example semantic searches">
                {semanticExamples.map((query) => (
                  <Link
                    key={query}
                    href={`${recallGraphSearchHref}?q=${encodeURIComponent(query)}`}
                  >
                    {query}
                  </Link>
                ))}
              </div>

              <div className="home-pipeline-strip" aria-label="RecallGraph data pipeline">
                {pipelineSteps.map((step, index) => (
                  <span className="home-pipeline-step" key={step}>
                    {step}
                    {index < pipelineSteps.length - 1 ? (
                      <span className="home-pipeline-arrow" aria-hidden="true">
                        -&gt;
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>

              <p className="home-semantic-note">
                {semanticSearchReady
                  ? "Semantic search powered by embeddings and pgvector."
                  : "Semantic-search infrastructure is live. Production vector ranking activates when the pgvector database is connected."}
              </p>

              <div className="home-hero-quick">
                <Link className="home-hero-quick-link" href={recallGraphSearchHref}>
                  Semantic search
                </Link>
                <Link className="home-hero-quick-link" href="/recallgraph/dashboard">
                  Data dashboard
                </Link>
                <Link className="home-hero-quick-link" href={recallsAction}>
                  {t.heroQuickFda}
                </Link>
                <Link className="home-hero-quick-link" href={carsHref}>
                  {t.heroQuickVehicle}
                </Link>
                <Link className="home-hero-quick-link" href={generalHref}>
                  {t.heroQuickGeneral}
                </Link>
              </div>
            </div>

            <div className="home-ai-panel" aria-label="RecallGraph semantic search preview">
              <div className="home-ai-panel-header">
                <span className="home-ai-panel-kicker">semantic query console</span>
                <span className="home-ai-panel-status">live pipeline</span>
              </div>
              <div className="home-ai-query">
                <span>Query</span>
                <strong>battery overheating in children's products</strong>
              </div>
              <div className="home-ai-matches" aria-label="Meaning match result rows">
                <div className="home-ai-result-row home-ai-result-row--active">
                  <span>Meaning match</span>
                  <strong>hazard pattern match</strong>
                  <p>Thermal runaway, overheating, burn risk, chargers, toys.</p>
                </div>
                <div className="home-ai-result-row">
                  <span>embedding search</span>
                  <strong>related recall graph</strong>
                  <p>Finds neighboring recalls that share products, hazards, and remedies.</p>
                </div>
                <div className="home-ai-result-row">
                  <span>source-backed results</span>
                  <strong>public recall details</strong>
                  <p>Each result links back to the public source record for verification.</p>
                </div>
              </div>
              <div className="home-ai-network" aria-hidden="true">
                <span className="home-ai-line home-ai-line--1" />
                <span className="home-ai-line home-ai-line--2" />
                <span className="home-ai-line home-ai-line--3" />
                <span className="home-ai-node home-ai-node--center">risk</span>
                <span className="home-ai-node home-ai-node--top">charger</span>
                <span className="home-ai-node home-ai-node--right">toy</span>
                <span className="home-ai-node home-ai-node--bottom">burn</span>
              </div>
            </div>
          </div>

          <div className="home-stats" aria-label="Site statistics">
            <div className="home-stat">
              <span className="home-stat-value">{recallsCountText}</span>
              <span className="home-stat-label">{t.statRecalls}</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">{t.statSourcesValue}</span>
              <span className="home-stat-label">{t.statSources}</span>
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
          Browse by source
        </p>
        <h2 id="categories-heading" className="home-section-title">
          Browse the source data
        </h2>

        <div className="home-category-grid">
          <Link
            href={recallGraphHref}
            className="home-category-card home-category-card--primary"
            aria-label="RecallGraph AI recall intelligence"
          >
            <span className="home-category-icon home-category-icon--ai" aria-hidden="true">
              AI
            </span>
            <h3>RecallGraph Intelligence</h3>
            <p>
              Search recalls by meaning, inspect related hazard patterns, and review the
              structured public data pipeline behind the results.
            </p>
            <span className="home-category-pill" aria-hidden="true">
              Explore RecallGraph
            </span>
          </Link>

          <Link
            href={withLangPath("/recalls", lang)}
            className="home-category-card home-category-card--fda"
            aria-label={t.fdaTitle}
          >
            <span className="home-category-icon home-category-icon--fda" aria-hidden="true">
              FDA
            </span>
            <h3>FDA Recalls</h3>
            <p>{t.fdaBody}</p>
            <span className="home-category-pill" aria-hidden="true">
              Browse FDA recalls
            </span>
          </Link>

          <Link
            href={generalHref}
            className="home-category-card home-category-card--cpsc"
            aria-label="Consumer Product Recalls"
          >
            <span className="home-category-icon home-category-icon--cpsc" aria-hidden="true">
              CPSC
            </span>
            <h3>Consumer Product Recalls</h3>
            <p>{t.generalBody}</p>
            <span className="home-category-pill" aria-hidden="true">
              Browse product recalls
            </span>
          </Link>

          <Link
            href={withLangPath("/cars", lang)}
            className="home-category-card home-category-card--nhtsa"
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
