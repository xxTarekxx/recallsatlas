"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { isRtlUiLang, type SiteUiLang } from "@/lib/siteLocale";
import type { GeneralRecallListItem } from "@/lib/generalRecallListTypes";
import GeneralRecallCard from "./GeneralRecallCard";

const PAGE_SIZE = 50;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "ellipsis")[] = [1];
  if (current > 3) out.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    if (out.indexOf(p) === -1) out.push(p);
  }
  if (current < total - 2) out.push("ellipsis");
  if (total > 1 && out.indexOf(total) === -1) out.push(total);
  return out;
}

type Props = {
  uiLang?: SiteUiLang;
};

export default function GeneralRecallsListClient({ uiLang = "en" }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const [items, setItems] = useState<GeneralRecallListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (q) params.set("q", q);
        params.set("lang", uiLang);
        const res = await fetch(`/api/general-recalls?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load recalls");
        const data = await res.json();
        setItems(data.items || []);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setTotal(data.total ?? 0);
        setPage(Math.max(1, data.page ?? pageNum));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load recalls.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [q, uiLang]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchPage(nextPage);
  };

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  const pageNumbers = getPageNumbers(page, totalPages);

  const PaginationBar = () => (
    <div
      role="region"
      aria-label="Pagination"
      style={{
        margin: "1rem 0",
        padding: "1rem",
        backgroundColor: "#ffffff",
        border: "2px solid #0f172a",
        borderRadius: "8px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
      }}
    >
      <button
        type="button"
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#0f172a",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: page <= 1 || loading ? "not-allowed" : "pointer",
          opacity: page <= 1 || loading ? 0.5 : 1,
        }}
        disabled={page <= 1 || loading}
        onClick={() => goToPage(page - 1)}
      >
        ← Previous
      </button>
      <span style={{ fontSize: "1rem", color: "#1e293b" }}>
        Page <strong style={{ color: "#0f172a" }}>{page}</strong> of{" "}
        <strong style={{ color: "#0f172a" }}>{totalPages}</strong>
        {total > 0 && (
          <span style={{ marginLeft: "0.25rem", color: "#64748b" }}>
            {" "}
            ({total.toLocaleString()} recalls)
          </span>
        )}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
        {pageNumbers.map((n, i) =>
          n === "ellipsis" ? (
            <span key={`e-${i}`} style={{ padding: "0 0.25rem", color: "#64748b" }}>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              style={{
                minWidth: "2.25rem",
                padding: "0.4rem 0.5rem",
                backgroundColor: n === page ? "#0f172a" : "#fff",
                color: n === page ? "#fff" : "#0f172a",
                border: "2px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
              onClick={() => goToPage(n)}
            >
              {n}
            </button>
          )
        )}
      </div>
      <button
        type="button"
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#0f172a",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: page >= totalPages || loading ? "not-allowed" : "pointer",
          opacity: page >= totalPages || loading ? 0.5 : 1,
        }}
        disabled={page >= totalPages || loading}
        onClick={() => goToPage(page + 1)}
      >
        Next →
      </button>
    </div>
  );

  if (loading && items.length === 0) {
    return (
      <>
        <PaginationBar />
        <p className="placeholder-note">Loading recalls…</p>
      </>
    );
  }

  if (!items.length) {
    return (
      <>
        <PaginationBar />
        <p className="placeholder-note">No matching consumer recalls found.</p>
      </>
    );
  }

  const listDir = isRtlUiLang(uiLang) ? "rtl" : "ltr";

  return (
    <>
      <PaginationBar />
      <section
        className={`recalls-grid ${loading ? "recalls-grid--loading" : ""}`}
        dir={listDir}
        lang={uiLang}
      >
        {items.map((item) => (
          <GeneralRecallCard key={item.slug} item={item} uiLang={uiLang} />
        ))}
      </section>
      <PaginationBar />
    </>
  );
}
