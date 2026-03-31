"use client";

import { FormEvent, useEffect, useState } from "react";

type RecallItem = {
  campaignNumber: string;
  summary: string;
  remedy: string;
  consequence: string;
  component: string;
  reportDate: string;
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
  const [translations, setTranslations] = useState<Record<string, Record<string, { summary: string; remedy: string }>>>({});

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
      setTranslations({});
    } catch (err: any) {
      setResults(null);
      setError(err?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!results || selectedLang === "en") return;

    let cancelled = false;
    async function runTranslations() {
      setTranslating(true);
      try {
        for (const recall of results.recalls) {
          const campaignNumber = recall.campaignNumber;
          const cached = translations[campaignNumber]?.[selectedLang];
          if (cached) continue;

          // eslint-disable-next-line no-await-in-loop
          const res = await fetch("/api/cars/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignNumber, lang: selectedLang }),
          });
          if (!res.ok) continue;
          // eslint-disable-next-line no-await-in-loop
          const data = await res.json();
          if (cancelled) return;

          setTranslations((prev) => ({
            ...prev,
            [campaignNumber]: {
              ...(prev[campaignNumber] || {}),
              [selectedLang]: {
                summary: String(data?.summary || ""),
                remedy: String(data?.remedy || ""),
              },
            },
          }));
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
    <main
      className="container py-5"
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "28px 16px 56px",
      }}
    >
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: "0 6px 24px rgba(15, 23, 42, 0.06)",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: 1.1, color: "#475569" }}>NHTSA LOOKUP</p>
        <h1 style={{ margin: "8px 0 6px", fontSize: 34, lineHeight: 1.1 }}>Vehicle Recalls</h1>
        <p style={{ margin: 0, color: "#334155" }}>
          Check recalls by VIN or by year, make, and model.
        </p>
      </section>

      <form
        onSubmit={onSearch}
        style={{
          marginTop: 18,
          display: "grid",
          gap: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 20,
          background: "#ffffff",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="vin" style={{ fontWeight: 600, color: "#0f172a" }}>VIN</label>
          <input
            id="vin"
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            placeholder="Enter VIN"
            style={{ padding: 11, borderRadius: 10, border: "1px solid #cbd5e1" }}
          />
        </div>

        <div
          style={{
            opacity: 0.8,
            textAlign: "center",
            fontWeight: 600,
            color: "#334155",
            borderTop: "1px dashed #cbd5e1",
            borderBottom: "1px dashed #cbd5e1",
            padding: "8px 0",
          }}
        >
          OR
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="year" style={{ fontWeight: 600, color: "#0f172a" }}>Year</label>
            <input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Year"
              style={{ padding: 11, borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="make" style={{ fontWeight: 600, color: "#0f172a" }}>Make</label>
            <input
              id="make"
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Make"
              style={{ padding: 11, borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor="model" style={{ fontWeight: 600, color: "#0f172a" }}>Model</label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model"
              style={{ padding: 11, borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: 180,
            padding: "11px 14px",
            borderRadius: 10,
            border: "none",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Loading..." : "Search Recalls"}
        </button>
      </form>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <label htmlFor="lang" style={{ fontWeight: 600, color: "#0f172a" }}>Language:</label>
        <select
          id="lang"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
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
        {translating ? <span style={{ color: "#475569" }}>Translating...</span> : null}
      </div>

      {error ? (
        <p
          style={{
            color: "#b00020",
            marginTop: 14,
            padding: "10px 12px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 10,
          }}
        >
          {error}
        </p>
      ) : null}

      {results ? (
        <section style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>
            Results for {results.vehicle.year} {results.vehicle.make} {results.vehicle.model}
          </h2>

          {results.recalls.length === 0 ? (
            <p style={{ marginTop: 4 }}>No recalls found</p>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {results.recalls.map((recall) => (
                <article
                  key={recall.campaignNumber}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    background: "#ffffff",
                    boxShadow: "0 3px 14px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  {(() => {
                    const translated = translations[recall.campaignNumber]?.[selectedLang];
                    const summary = selectedLang === "en"
                      ? recall.summary
                      : (translated?.summary || recall.summary);
                    const remedy = selectedLang === "en"
                      ? recall.remedy
                      : (translated?.remedy || recall.remedy);
                    return (
                      <>
                  <p style={{ margin: "0 0 8px" }}><strong>Campaign:</strong> {recall.campaignNumber}</p>
                  <p style={{ margin: "0 0 8px", color: "#1e293b" }}><strong>Summary:</strong> {summary}</p>
                  <p style={{ margin: 0, color: "#1e293b" }}><strong>Remedy:</strong> {remedy}</p>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

