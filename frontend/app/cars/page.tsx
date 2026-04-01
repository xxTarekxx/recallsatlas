"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getCarsPageUi } from "@/lib/cars/carsPageUi";
import styles from "./cars.module.css";

const LS_VIN = "recallsatlas_cars_vin";
const LS_YEAR = "recallsatlas_cars_year";
const LS_MAKE = "recallsatlas_cars_make";
const LS_MODEL = "recallsatlas_cars_model";
const SS_RESULTS = "recallsatlas_cars_last_results";
const LS_VIN_HISTORY = "recallsatlas_cars_vin_history";
const MAX_VIN_HISTORY = 30;
const VIN_DATALIST_ID = "recallsatlas-vin-datalist";

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
    { summary: string; remedy: string; consequence?: string }
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

export default function CarsPage() {
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [results, setResults] = useState<LookupResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedLang, setSelectedLang] = useState("en");
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
    if (!enConsequence) return false;
    return !t.consequence?.trim();
  }

  useEffect(() => {
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
  }, []);

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
        throw new Error("Enter VIN, or Year + Make + Model.");
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
      if (!res.ok) throw new Error(data?.error || "Request failed");
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
      setSelectedLang("en");
    } catch (err: any) {
      setResults(null);
      setError(err?.message || "Search failed");
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

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.heroKicker}>NHTSA safety lookup</p>
        <h1 className={styles.heroTitle}>Vehicle recalls</h1>
        <p className={styles.heroSub}>
          Decode a VIN or enter year, make, and model to see open campaigns. Open a
          campaign for the full page; switch language to translate on demand.
        </p>
      </section>

      <form
        className={styles.formCard}
        onSubmit={onSearch}
        autoComplete="on"
        name="vehicle_recall_lookup"
      >
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="vin">
              VIN
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
              placeholder="17-character VIN"
              list={VIN_DATALIST_ID}
              autoComplete="on"
              inputMode="text"
              maxLength={17}
              spellCheck={false}
              aria-describedby="vin-suggestions-hint"
            />
            <p id="vin-suggestions-hint" className={styles.fieldHint}>
              Tap the field or start typing to pick from VINs you searched before on this device.
            </p>
          </div>

          <div className={styles.divider}>or year / make / model</div>

          <div className={styles.row3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="year">
                Year
              </label>
              <input
                id="year"
                name="vehicle_year"
                className={styles.input}
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2019"
                autoComplete="on"
                onBlur={persistYearOnly}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="make">
                Make
              </label>
              <input
                id="make"
                name="vehicle_make"
                className={styles.input}
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Honda"
                autoComplete="on"
                onBlur={persistMakeOnly}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="model">
                Model
              </label>
              <input
                id="model"
                name="vehicle_model"
                className={styles.input}
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Civic"
                autoComplete="on"
                onBlur={persistModelOnly}
              />
            </div>
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search recalls"}
          </button>
        </div>
      </form>

      <div className={styles.toolbar}>
        <label className={styles.label} htmlFor="lang">
          {ui.displayLanguage}
        </label>
        <select
          id="lang"
          className={styles.select}
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="ar">Arabic</option>
          <option value="zh">Chinese</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
          <option value="pt">Portuguese</option>
          <option value="hi">Hindi</option>
          <option value="ru">Russian</option>
          <option value="vi">Vietnamese</option>
        </select>
        {translating ? (
          <span className={styles.translating}>{ui.translating}</span>
        ) : null}
      </div>

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
                <p className={styles.resultsTitleEn}>
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
                <span className={styles.resultsMetaEn}>
                  {results.recalls.length === 0
                    ? ui.metaNoCampaignsEn
                    : ui.metaCampaignsEn(results.recalls.length)}
                </span>
              ) : null}
            </div>
          </div>

          {results.recalls.length === 0 ? (
            <div className={styles.empty}>
              No active recalls reported for this vehicle in NHTSA data.
            </div>
          ) : (
            <div className={styles.cardList}>
              {results.recalls.map((recall) => {
                const translated = recall.translations?.[selectedLang];
                const summary =
                  selectedLang === "en"
                    ? recall.summary
                    : translated?.summary || recall.summary;
                const remedy =
                  selectedLang === "en"
                    ? recall.remedy
                    : translated?.remedy || recall.remedy;
                const consequence =
                  selectedLang === "en"
                    ? recall.consequence
                    : translated?.consequence || recall.consequence;

                return (
                  <article key={recall.campaignNumber} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardTopMain}>
                        <span className={styles.campaignIdLabel}>{ui.campaignId}</span>
                        <Link
                          className={styles.campaignLink}
                          href={`/recalls/vehicle/${recall.campaignNumber}`}
                        >
                          {recall.campaignNumber}
                        </Link>
                      </div>
                      <div className={styles.pills}>
                        {recall.reportDate ? (
                          <span className={styles.pill}>
                            {ui.pillReport(recall.reportDate)}
                          </span>
                        ) : null}
                        {recall.component ? (
                          <span className={styles.pill}>{recall.component}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.block}>
                        <span className={styles.blockLabel}>{ui.blockSummary}</span>
                        <p className={styles.blockText}>{summary || "—"}</p>
                      </div>
                      {consequence ? (
                        <div className={styles.block}>
                          <span className={styles.blockLabel}>
                            {ui.blockConsequence}
                          </span>
                          <p className={styles.blockText}>{consequence}</p>
                        </div>
                      ) : null}
                      <div className={styles.block}>
                        <span className={styles.blockLabel}>{ui.blockRemedy}</span>
                        <div className={styles.remedyBox}>
                          <p className={styles.blockText}>{remedy || "—"}</p>
                        </div>
                      </div>
                      <span className={styles.badge}>Open campaign · NHTSA</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
