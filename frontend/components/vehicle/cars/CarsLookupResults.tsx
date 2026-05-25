import type { CarsPageUi } from "@/lib/cars/carsPageUi";
import type { LookupResponse } from "@/lib/cars/carsLookupTypes";
import type { SiteUiLang } from "@/lib/siteLocale";
import styles from "@/app/cars/cars.module.css";
import CarsRecallResultCard from "./CarsRecallResultCard";

type Props = {
  pageDir: "ltr" | "rtl";
  results: LookupResponse;
  selectedLang: SiteUiLang;
  translating: boolean;
  ui: CarsPageUi;
};

export default function CarsLookupResults({
  pageDir,
  results,
  selectedLang,
  translating,
  ui,
}: Props) {
  return (
    <section className={styles.resultsSection} aria-live="polite">
      <div className={styles.resultsHead}>
        <div className={styles.resultsTitleWrap}>
          <h2 className={styles.resultsTitle}>
            {ui.openRecallsFor(
              results.vehicle.year,
              results.vehicle.make,
              results.vehicle.model
            )}
          </h2>
          {selectedLang !== "en" ? (
            <p
              className={`${styles.resultsTitleEn} ${styles.embedLtr}`}
              dir="ltr"
              lang="en"
            >
              {ui.openRecallsForEn(
                results.vehicle.year,
                results.vehicle.make,
                results.vehicle.model
              )}
            </p>
          ) : null}
        </div>
        <div className={styles.resultsMetaWrap}>
          <span className={styles.resultsMeta}>
            {results.recalls.length === 0
              ? ui.metaNoCampaigns
              : ui.metaCampaigns(results.recalls.length)}
          </span>
          {selectedLang !== "en" ? (
            <span
              className={`${styles.resultsMetaEn} ${styles.embedLtr}`}
              dir="ltr"
              lang="en"
            >
              {results.recalls.length === 0
                ? ui.metaNoCampaignsEn
                : ui.metaCampaignsEn(results.recalls.length)}
            </span>
          ) : null}
        </div>
      </div>

      {translating ? (
        <p className={styles.translating} aria-live="polite">
          {ui.translating}
        </p>
      ) : null}

      {results.recalls.length === 0 ? (
        <div className={styles.empty} dir={pageDir} lang={selectedLang}>
          {ui.emptyNoRecalls}
        </div>
      ) : (
        <div className={styles.cardList}>
          {results.recalls.map((recall) => (
            <CarsRecallResultCard
              key={recall.campaignNumber}
              recall={recall}
              selectedLang={selectedLang}
              ui={ui}
            />
          ))}
        </div>
      )}
    </section>
  );
}
