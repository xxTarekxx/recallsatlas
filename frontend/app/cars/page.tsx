"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getCarsPageUi } from "@/lib/cars/carsPageUi";
import { parseLangFromPathname, withLangPath } from "@/lib/siteLocale";
import { isLikelyVin17, normalizeVinInput } from "@/lib/vin";
import styles from "./cars.module.css";

const LS_VIN = "recallsatlas_cars_vin";
const LS_YEAR = "recallsatlas_cars_year";
const LS_MAKE = "recallsatlas_cars_make";
const LS_MODEL = "recallsatlas_cars_model";
const SS_RESULTS = "recallsatlas_cars_last_results";
const LS_VIN_HISTORY = "recallsatlas_cars_vin_history";
const MAX_VIN_HISTORY = 30;
const VIN_DATALIST_ID = "recallsatlas-vin-datalist";
/** Bidi: Arabic (extend here if you add Hebrew, etc.) */
const RTL_LANGS = new Set(["ar"]);

function loadVinHistoryFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_VIN_HISTORY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is string => typeof x === "string" && x.trim().length >= 8
    );
  } catch {
    return [];
  }
}

function saveVinHistoryToStorage(list: string[]) {
  localStorage.setItem(LS_VIN_HISTORY, JSON.stringify(list.slice(0, MAX_VIN_HISTORY)));
}

/** Dedupe, newest first; min length 8 so short test values still list. */
function addVinToHistory(list: string[], rawVin: string): string[] {
  const v = rawVin.trim().toUpperCase();
  if (v.length < 8) return list;
  const without = list.filter((x) => x !== v);
  return [v, ...without].slice(0, MAX_VIN_HISTORY);
}

type RecallItem = {
  campaignNumber: string;
  summary: string;
  remedy: string;
  consequence: string;
  component: string;
  reportDate: string;
  languages: string[];
  translations?: Record<
    string,
    { summary: string; remedy: string; consequence?: string; component?: string }
  >;
};

type LookupResponse = {
  vehicle: {
    year: string;
    make: string;
    model: string;
  };
  recalls: RecallItem[];
};

function CarsPageInner() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const selectedLang = parseLangFromPathname(pathname);
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [results, setResults] = useState<LookupResponse | null>(null);
  const [error, setError] = useState("");
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const vinInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const ui = useMemo(() => getCarsPageUi(selectedLang), [selectedLang]);

  function recallNeedsTranslation(recall: RecallItem, lang: string) {
    if (lang === "en") return false;
    const t = recall.translations?.[lang];
    if (!t?.summary?.trim() || !t.remedy?.trim()) return true;
    const enConsequence = (
      recall.consequence ||
      recall.translations?.en?.consequence ||
      ""
    ).trim();
    if (enConsequence && !t.consequence?.trim()) return true;
    const enComponent = (
      recall.component ||
      recall.translations?.en?.component ||
      ""
    ).trim();
    if (enComponent && !t.component?.trim()) return true;
    return false;
  }

  useEffect(() => {
    const param = searchParams.get("vin");
    if (param?.trim()) {
      const n = normalizeVinInput(param);
      if (isLikelyVin17(n)) {
        setVin(n);
        try {
          setResults(null);
          sessionStorage.removeItem(SS_RESULTS);
        } catch {
          /* ignore */
        }
        let hist = loadVinHistoryFromStorage();
        hist = addVinToHistory(hist, n);
        saveVinHistoryToStorage(hist);
        setVinHistory(hist);
        try {
          const sy = localStorage.getItem(LS_YEAR);
          const sm = localStorage.getItem(LS_MAKE);
          const smod = localStorage.getItem(LS_MODEL);
          if (sy) setYear(sy);
          if (sm) setMake(sm);
          if (smod) setModel(smod);
        } catch {
          /* ignore */
        }
        hydratedRef.current = true;
        return;
      }
    }

    try {
      const sv = localStorage.getItem(LS_VIN);
      const sy = localStorage.getItem(LS_YEAR);
      const sm = localStorage.getItem(LS_MAKE);
      const smod = localStorage.getItem(LS_MODEL);
      if (sv) setVin(sv);
      if (sy) setYear(sy);
      if (sm) setMake(sm);
      if (smod) setModel(smod);

      let hist = loadVinHistoryFromStorage();
      if (sv) {
        hist = addVinToHistory(hist, sv);
        saveVinHistoryToStorage(hist);
      }
      setVinHistory(hist);

      const raw = sessionStorage.getItem(SS_RESULTS);
      if (raw) {
        const parsed = JSON.parse(raw) as LookupResponse;
        if (parsed?.vehicle && Array.isArray(parsed.recalls)) {
          setResults(parsed);
        }
      }
    } catch {
      /* ignore */
    } finally {
      hydratedRef.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    const el = vinInputRef.current;
    if (!el) return;
    const syncFromDom = () => {
      const raw = el.value ?? "";
      if (raw.trim()) setVin(raw);
    };
    el.addEventListener("change", syncFromDom);
    const timeouts = [0, 100, 300, 800].map((ms) => window.setTimeout(syncFromDom, ms));
    return () => {
      el.removeEventListener("change", syncFromDom);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  /** Only update the VIN key — avoids wiping VIN when another field blurs before hydration. */
  function persistVinOnly() {
    if (!hydratedRef.current) return;
    try {
      if (vin.trim()) localStorage.setItem(LS_VIN, vin.trim());
      else localStorage.removeItem(LS_VIN);
    } catch {
      /* ignore */
    }
  }

  function persistYearOnly() {
    if (!hydratedRef.current) return;
    try {
      if (year.trim()) localStorage.setItem(LS_YEAR, year.trim());
      else localStorage.removeItem(LS_YEAR);
    } catch {
      /* ignore */
    }
  }

  function persistMakeOnly() {
    if (!hydratedRef.current) return;
    try {
      if (make.trim()) localStorage.setItem(LS_MAKE, make.trim());
      else localStorage.removeItem(LS_MAKE);
    } catch {
      /* ignore */
    }
  }

  function persistModelOnly() {
    if (!hydratedRef.current) return;
    try {
      if (model.trim()) localStorage.setItem(LS_MODEL, model.trim());
      else localStorage.removeItem(LS_MODEL);
    } catch {
      /* ignore */
    }
  }

  function persistAllFormFieldsAfterSearch() {
    try {
      if (vin.trim()) localStorage.setItem(LS_VIN, vin.trim());
      else localStorage.removeItem(LS_VIN);
      if (year.trim()) localStorage.setItem(LS_YEAR, year.trim());
      else localStorage.removeItem(LS_YEAR);
      if (make.trim()) localStorage.setItem(LS_MAKE, make.trim());
      else localStorage.removeItem(LS_MAKE);
      if (model.trim()) localStorage.setItem(LS_MODEL, model.trim());
      else localStorage.removeItem(LS_MODEL);
    } catch {
      /* ignore */
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const hasVin = vin.trim().length > 0;
      if (!hasVin && (!year.trim() || !make.trim() || !model.trim())) {
        throw new Error(ui.errorNeedVinOrYmm);
      }

      const body = hasVin
        ? { vin: vin.trim() }
        : { year: Number(year), make: make.trim(), model: model.trim() };

      const res = await fetch("/api/cars/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        if (
          data?.code === "VIN_LOOKUP_NOT_FOUND" &&
          typeof data?.vin === "string"
        ) {
          setError(ui.vinLookupNotFound(normalizeVinInput(data.vin)));
          setResults(null);
          try {
            sessionStorage.removeItem(SS_RESULTS);
          } catch {
            /* ignore */
          }
          return;
        }
        throw new Error(data?.error || ui.errorSearchFailed);
      }

      const recalls = Array.isArray(data?.recalls) ? data.recalls : [];
      if (hasVin && recalls.length === 0) {
        persistAllFormFieldsAfterSearch();
        setVinHistory((h) => {
          const next = addVinToHistory(h, vin.trim());
          try {
            saveVinHistoryToStorage(next);
          } catch {
            /* ignore */
          }
          return next;
        });
        setError(ui.vinNoRecalls(normalizeVinInput(vin.trim())));
        setResults(null);
        try {
          sessionStorage.removeItem(SS_RESULTS);
        } catch {
          /* ignore */
        }
        return;
      }

      persistAllFormFieldsAfterSearch();
      if (hasVin) {
        setVinHistory((h) => {
          const next = addVinToHistory(h, vin.trim());
          try {
            saveVinHistoryToStorage(next);
          } catch {
            /* ignore */
          }
          return next;
        });
      }
      try {
        sessionStorage.setItem(SS_RESULTS, JSON.stringify(data));
      } catch {
        /* ignore */
      }
      setResults(data);
    } catch (err: any) {
      setResults(null);
      setError(err?.message || ui.errorSearchFailed);
      try {
        sessionStorage.removeItem(SS_RESULTS);
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!results || selectedLang === "en") return;
    const snapshot = results;

    let cancelled = false;
    async function runTranslations() {
      const recallsToFetch = snapshot.recalls.filter((recall) =>
        recallNeedsTranslation(recall, selectedLang)
      );

      if (recallsToFetch.length === 0) return;

      setTranslating(true);
      try {
        for (const recall of recallsToFetch) {
          const campaignNumber = recall.campaignNumber;
          const summary =
            recall.translations?.en?.summary || recall.summary || "";
          const remedy = recall.translations?.en?.remedy || recall.remedy || "";
          const consequence =
            recall.translations?.en?.consequence || recall.consequence || "";
          const component =
            recall.translations?.en?.component || recall.component || "";
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch("/api/cars/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignNumber,
              lang: selectedLang,
              summary,
              remedy,
              consequence,
              component,
            }),
          });
          if (!res.ok) continue;
          // eslint-disable-next-line no-await-in-loop
          const data = await res.json();
          if (cancelled) return;
          const updatedCampaignNumber = String(data?.campaignNumber || campaignNumber);
          const updatedTranslation = {
            summary: String(data?.summary || ""),
            remedy: String(data?.remedy || ""),
            consequence: String(data?.consequence || ""),
            component: String(data?.component || ""),
          };

          setResults((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              recalls: prev.recalls.map((item) => {
                if (item.campaignNumber !== updatedCampaignNumber) return item;
                const nextTranslations = {
                  ...(item.translations || {}),
                  [selectedLang]: updatedTranslation,
                };
                const nextLanguages = Array.from(
                  new Set([...(item.languages || ["en"]), selectedLang])
                );
                return {
                  ...item,
                  languages: nextLanguages,
                  translations: nextTranslations,
                };
              }),
            };
          });
        }
      } finally {
        if (!cancelled) setTranslating(false);
      }
    }

    runTranslations();
    return () => {
      cancelled = true;
    };
  }, [selectedLang, results]);

  useEffect(() => {
    if (!results) return;
    try {
      sessionStorage.setItem(SS_RESULTS, JSON.stringify(results));
    } catch {
      /* ignore */
    }
  }, [results]);

  const pageDir = RTL_LANGS.has(selectedLang) ? "rtl" : "ltr";

  return (
    <main className={styles.page} dir={pageDir} lang={selectedLang}>
      <section className={styles.hero} dir={pageDir} lang={selectedLang}>
        <p className={styles.heroKicker}>{ui.heroKicker}</p>
        <h1 className={styles.heroTitle}>{ui.heroTitle}</h1>
        <p className={styles.heroSub}>{ui.heroSub}</p>
      </section>

      <form
        className={styles.formCard}
        dir={pageDir}
        lang={selectedLang}
        onSubmit={onSearch}
        autoComplete="on"
        name="vehicle_recall_lookup"
      >
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="vin">
              {ui.labelVin}
            </label>
            <datalist id={VIN_DATALIST_ID}>
              {vinHistory.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <input
              ref={vinInputRef}
              id="vin"
              name="vin"
              className={styles.input}
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              onBlur={persistVinOnly}
              placeholder={ui.placeholderVin}
              list={VIN_DATALIST_ID}
              autoComplete="on"
              inputMode="text"
              maxLength={17}
              spellCheck={false}
              aria-describedby="vin-suggestions-hint"
              dir="ltr"
              lang="en"
            />
            <p id="vin-suggestions-hint" className={styles.fieldHint}>
              {ui.vinHint}
            </p>
          </div>

          <div className={styles.divider}>{ui.dividerOr}</div>

          <div className={styles.row3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="year">
                {ui.labelYear}
              </label>
              <input
                id="year"
                name="vehicle_year"
                className={styles.input}
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder={ui.placeholderYear}
                autoComplete="on"
                onBlur={persistYearOnly}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="make">
                {ui.labelMake}
              </label>
              <input
                id="make"
                name="vehicle_make"
                className={styles.input}
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder={ui.placeholderMake}
                autoComplete="on"
                onBlur={persistMakeOnly}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="model">
                {ui.labelModel}
              </label>
              <input
                id="model"
                name="vehicle_model"
                className={styles.input}
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={ui.placeholderModel}
                autoComplete="on"
                onBlur={persistModelOnly}
              />
            </div>
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? ui.searchButtonSearching : ui.searchButton}
          </button>
        </div>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}

      {results ? (
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
              {results.recalls.map((recall) => {
                const translated = recall.translations?.[selectedLang];
                const summary =
                  selectedLang === "en"
                    ? recall.summary
                    : translated?.summary || recall.summary;
                const detailHref = withLangPath(
                  `/recalls/vehicle/${recall.campaignNumber}`,
                  selectedLang
                );

                return (
                  <Link
                    key={recall.campaignNumber}
                    href={detailHref}
                    className={styles.cardLink}
                    aria-label={`${ui.campaignId} ${recall.campaignNumber}. ${ui.cardViewDetails}`}
                  >
                    <article className={styles.card}>
                      <div className={styles.cardTeaser}>
                        <div className={styles.cardTeaserMeta}>
                          {recall.reportDate ? (
                            <span className={styles.pill}>
                              {ui.pillReport(recall.reportDate)}
                            </span>
                          ) : null}
                          <div
                            className={`${styles.cardTeaserCampaign} ${styles.embedLtr}`}
                            dir="ltr"
                            lang="en"
                          >
                            <span className={styles.campaignIdLabel}>
                              {ui.campaignId}
                            </span>
                            <span className={styles.campaignNumber}>
                              {recall.campaignNumber}
                            </span>
                          </div>
                        </div>
                        <div className={styles.cardTeaserBody}>
                          <span className={styles.cardTeaserSummaryLabel}>
                            {ui.blockSummary}
                          </span>
                          <p className={styles.cardTeaserSummary}>
                            {(summary || "—").trim() || "—"}
                          </p>
                        </div>
                        <div className={styles.cardTeaserFoot}>
                          <span className={styles.cardTeaserCta}>
                            {ui.cardViewDetails}
                          </span>
                          <span
                            className={styles.cardTeaserCtaArrow}
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

export default function CarsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <p>Loading…</p>
        </div>
      }
    >
      <CarsPageInner />
    </Suspense>
  );
}
