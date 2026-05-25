import Link from "next/link";
import type { CarsPageUi } from "@/lib/cars/carsPageUi";
import type { RecallItem } from "@/lib/cars/carsLookupTypes";
import { withLangPath, type SiteUiLang } from "@/lib/siteLocale";
import styles from "@/app/cars/cars.module.css";

type Props = {
  recall: RecallItem;
  selectedLang: SiteUiLang;
  ui: CarsPageUi;
};

export default function CarsRecallResultCard({ recall, selectedLang, ui }: Props) {
  const translated = recall.translations?.[selectedLang];
  const summary =
    selectedLang === "en" ? recall.summary : translated?.summary || recall.summary;
  const detailHref = withLangPath(
    `/recalls/vehicle/${recall.campaignNumber}`,
    selectedLang
  );

  return (
    <Link
      href={detailHref}
      className={styles.cardLink}
      aria-label={`${ui.campaignId} ${recall.campaignNumber}. ${ui.cardViewDetails}`}
    >
      <article className={styles.card}>
        <div className={styles.cardTeaser}>
          <div className={styles.cardTeaserMeta}>
            {recall.reportDate ? (
              <span className={styles.pill}>{ui.pillReport(recall.reportDate)}</span>
            ) : null}
            <div
              className={`${styles.cardTeaserCampaign} ${styles.embedLtr}`}
              dir="ltr"
              lang="en"
            >
              <span className={styles.campaignIdLabel}>{ui.campaignId}</span>
              <span className={styles.campaignNumber}>{recall.campaignNumber}</span>
            </div>
          </div>
          <div className={styles.cardTeaserBody}>
            <span className={styles.cardTeaserSummaryLabel}>{ui.blockSummary}</span>
            <p className={styles.cardTeaserSummary}>
              {(summary || "-").trim() || "-"}
            </p>
          </div>
          <div className={styles.cardTeaserFoot}>
            <span className={styles.cardTeaserCta}>{ui.cardViewDetails}</span>
            <span className={styles.cardTeaserCtaArrow} aria-hidden="true">
              -&gt;
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
