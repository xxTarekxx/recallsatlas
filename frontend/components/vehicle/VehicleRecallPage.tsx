import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarsPageUi } from "@/lib/cars/carsPageUi";
import { getRecallFromDB } from "@/lib/cars/carDb";
import { VEHICLE_RECALL_PAGE_UI } from "@/lib/cars/vehicleRecallPageUi";
import { isSiteUiLang, withLangPath, type SiteUiLang } from "@/lib/siteLocale";
import styles from "./VehicleRecallPage.module.css";

type Props = {
  campaignNumber: string;
  lang?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function VehicleRecallPage({ campaignNumber, lang = "en" }: Props) {
  const normalizedCampaign = String(campaignNumber || "").trim();
  if (!normalizedCampaign) notFound();
  if (!isSiteUiLang(lang)) notFound();

  const l = lang as SiteUiLang;
  const ui = getCarsPageUi(l);
  const pageUi = VEHICLE_RECALL_PAGE_UI[l];

  const recall: Record<string, unknown> | null = await getRecallFromDB(normalizedCampaign);
  if (!recall) notFound();

  const languages =
    recall?.languages && typeof recall.languages === "object"
      ? (recall.languages as Record<string, Record<string, string>>)
      : {};
  const base = languages?.en || {};
  const hasTranslation = l !== "en" && Boolean(languages?.[l]);
  const active = hasTranslation ? languages?.[l] || {} : base;

  const summary = clean(active.summary) || clean(base.summary);
  const remedy = clean(active.remedy) || clean(base.remedy);
  const component = clean(recall?.component);
  const reportDate = clean(recall?.reportDate);

  const carsHref = withLangPath("/cars", l);

  return (
    <main className={styles.page} lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
      <Link href={carsHref} className={styles.back}>
        {pageUi.back}
      </Link>

      <section
        className={styles.hero}
        aria-labelledby="vehicle-recall-title"
        dir={l === "ar" ? "rtl" : "ltr"}
        lang={l}
      >
        <p className={styles.eyebrow}>{pageUi.eyebrow}</p>
        <h1 id="vehicle-recall-title" className={styles.title}>
          <span className={styles.campaignMono} dir="ltr" lang="en">
            {normalizedCampaign}
          </span>
        </h1>
        {reportDate ? (
          <div className={styles.datePill}>{ui.pillReport(reportDate)}</div>
        ) : null}
      </section>

      {!hasTranslation && l !== "en" ? (
        <p className={styles.fallback} role="status">
          {pageUi.fallbackEn}
        </p>
      ) : null}

      <div className={styles.blocks}>
        <section className={styles.block} aria-labelledby="vrs-summary">
          <span id="vrs-summary" className={styles.blockLabel}>
            {ui.blockSummary}
          </span>
          <p
            className={`${styles.blockBody}${!summary ? ` ${styles.blockBodyMuted}` : ""}`}
          >
            {summary || "—"}
          </p>
        </section>

        <section className={styles.block} aria-labelledby="vrs-remedy">
          <span id="vrs-remedy" className={styles.blockLabel}>
            {ui.blockRemedy}
          </span>
          <p
            className={`${styles.blockBody}${!remedy ? ` ${styles.blockBodyMuted}` : ""}`}
          >
            {remedy || "—"}
          </p>
        </section>

        <section className={styles.block} aria-labelledby="vrs-component">
          <span id="vrs-component" className={styles.blockLabel}>
            {ui.blockComponent}
          </span>
          <p
            className={`${styles.blockBody}${!component ? ` ${styles.blockBodyMuted}` : ""}`}
          >
            {component || "—"}
          </p>
        </section>
      </div>
    </main>
  );
}
