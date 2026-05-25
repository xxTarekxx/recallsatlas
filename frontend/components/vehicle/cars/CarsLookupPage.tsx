"use client";

import type { FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCarsPageUi } from "@/lib/cars/carsPageUi";
import {
  addVinToHistory,
  loadVinHistoryFromStorage,
  LS_MAKE,
  LS_MODEL,
  LS_VIN,
  LS_YEAR,
  saveVinHistoryToStorage,
  setOrRemoveLocalStorage,
  SS_RESULTS,
} from "@/lib/cars/carsLookupStorage";
import type { LookupResponse, RecallItem } from "@/lib/cars/carsLookupTypes";
import { parseLangFromPathname } from "@/lib/siteLocale";
import { isLikelyVin17, normalizeVinInput } from "@/lib/vin";
import styles from "@/app/cars/cars.module.css";
import CarsLookupForm from "./CarsLookupForm";
import CarsLookupResults from "./CarsLookupResults";

const RTL_LANGS = new Set(["ar"]);

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
  return Boolean(enComponent && !t.component?.trim());
}

export default function CarsLookupPage() {
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
        if (parsed?.vehicle && Array.isArray(parsed.recalls)) setResults(parsed);
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

  function persistLocalField(key: string, value: string) {
    if (!hydratedRef.current) return;
    try {
      setOrRemoveLocalStorage(key, value);
    } catch {
      /* ignore */
    }
  }

  function persistAllFormFieldsAfterSearch() {
    try {
      setOrRemoveLocalStorage(LS_VIN, vin);
      setOrRemoveLocalStorage(LS_YEAR, year);
      setOrRemoveLocalStorage(LS_MAKE, make);
      setOrRemoveLocalStorage(LS_MODEL, model);
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
        if (data?.code === "VIN_LOOKUP_NOT_FOUND" && typeof data?.vin === "string") {
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
          const summary = recall.translations?.en?.summary || recall.summary || "";
          const remedy = recall.translations?.en?.remedy || recall.remedy || "";
          const consequence =
            recall.translations?.en?.consequence || recall.consequence || "";
          const component = recall.translations?.en?.component || recall.component || "";
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

      <CarsLookupForm
        loading={loading}
        make={make}
        model={model}
        onSearch={onSearch}
        pageDir={pageDir}
        persistMakeOnly={() => persistLocalField(LS_MAKE, make)}
        persistModelOnly={() => persistLocalField(LS_MODEL, model)}
        persistVinOnly={() => persistLocalField(LS_VIN, vin)}
        persistYearOnly={() => persistLocalField(LS_YEAR, year)}
        selectedLang={selectedLang}
        setMake={setMake}
        setModel={setModel}
        setVin={setVin}
        setYear={setYear}
        ui={ui}
        vin={vin}
        vinHistory={vinHistory}
        vinInputRef={vinInputRef}
        year={year}
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      {results ? (
        <CarsLookupResults
          pageDir={pageDir}
          results={results}
          selectedLang={selectedLang}
          translating={translating}
          ui={ui}
        />
      ) : null}
    </main>
  );
}
