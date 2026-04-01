"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./cars.module.css";

type RecallItem = {
  campaignNumber: string;
  summary: string;
  remedy: string;
  consequence: string;
  component: string;
  reportDate: string;
  languages: string[];
  translations?: Record<string, { summary: string; remedy: string }>;
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
      setResults(data);
      setSelectedLang("en");
    } catch (err: any) {
      setResults(null);
      setError(err?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!results || selectedLang === "en") return;
    const snapshot = results;

    let cancelled = false;
    async function runTranslations() {
      const recallsToFetch = snapshot.recalls.filter((recall) => {
        const hasTranslation = Boolean(recall.translations?.[selectedLang]);
        return !hasTranslation;
      });

      if (recallsToFetch.length === 0) return;

      setTranslating(true);
      try {
        for (const recall of recallsToFetch) {
          const campaignNumber = recall.campaignNumber;
          const summary =
            recall.translations?.en?.summary || recall.summary || "";
          const remedy = recall.translations?.en?.remedy || recall.remedy || "";
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch("/api/cars/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignNumber,
              lang: selectedLang,
              summary,
              remedy,
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

      <form className={styles.formCard} onSubmit={onSearch}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="vin">
              VIN
            </label>
            <input
              id="vin"
              name="vehicle_vin"
              className={styles.input}
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17-character VIN"
              autoComplete="on"
              inputMode="text"
            />
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
          Display language
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
          <span className={styles.translating}>Translating…</span>
        ) : null}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {results ? (
        <section className={styles.resultsSection} aria-live="polite">
          <div className={styles.resultsHead}>
            <h2 className={styles.resultsTitle}>
              {results.vehicle.year} {results.vehicle.make} {results.vehicle.model}
            </h2>
            <span className={styles.resultsMeta}>
              {results.recalls.length === 0
                ? "No open campaigns"
                : `${results.recalls.length} campaign${results.recalls.length === 1 ? "" : "s"}`}
            </span>
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
                    : recall.consequence;

                return (
                  <article key={recall.campaignNumber} className={styles.card}>
                    <div className={styles.cardTop}>
                      <Link
                        className={styles.campaignLink}
                        href={`/recalls/vehicle/${recall.campaignNumber}`}
                      >
                        {recall.campaignNumber}
                      </Link>
                      <div className={styles.pills}>
                        {recall.reportDate ? (
                          <span className={styles.pill}>Report {recall.reportDate}</span>
                        ) : null}
                        {recall.component ? (
                          <span className={styles.pill}>{recall.component}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      {consequence ? (
                        <div className={styles.block}>
                          <span className={styles.blockLabel}>Consequence</span>
                          <p className={styles.blockText}>{consequence}</p>
                        </div>
                      ) : null}
                      <div className={styles.block}>
                        <span className={styles.blockLabel}>Summary</span>
                        <p className={styles.blockText}>{summary || "—"}</p>
                      </div>
                      <div className={styles.block}>
                        <span className={styles.blockLabel}>Remedy</span>
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
