"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isLikelyVin17, normalizeVinInput } from "@/lib/vin";

type Suggestion = {
  slug: string;
  headline: string;
  productType: string;
};

type SearchSuggestProps = {
  action: string;
  inputClassName: string;
  buttonClassName: string;
  wrapperClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
  buttonLabel?: string;
  loadingLabel?: string;
  suggestionsAriaLabel?: string;
  fieldSrLabel?: string;
  submitAriaLabel?: string;
  /** e.g. `/ar/recalls` so suggestion links stay on the same locale */
  recallsDetailBase?: string;
  inputDir?: "ltr" | "rtl" | "auto";
  /** When set, a valid 17-char VIN submits here instead of FDA search. */
  vehicleSearchUrl?: string;
  vehicleSearchHint?: string;
  vehicleSearchMeta?: string;
  /** Prefill from `?q=` on the recalls list (server + client navigations). */
  initialQuery?: string;
};

function recallDetailHref(base: string | undefined, slug: string) {
  const b = (base ?? "/recalls").replace(/\/$/, "");
  return `${b}/${encodeURIComponent(slug)}`;
}

export default function SearchSuggest({
  action,
  inputClassName,
  buttonClassName,
  wrapperClassName,
  placeholder = "Search recalls...",
  ariaLabel = "Search recalls",
  buttonLabel = "Search",
  loadingLabel = "Loading...",
  suggestionsAriaLabel = "Suggestions",
  fieldSrLabel = "Search recalls by headline or product type",
  submitAriaLabel = "Submit search",
  recallsDetailBase,
  inputDir = "auto",
  vehicleSearchUrl,
  vehicleSearchHint,
  vehicleSearchMeta = "VIN · NHTSA",
  initialQuery = "",
}: SearchSuggestProps) {
  const router = useRouter();
  const [q, setQ] = useState(() => String(initialQuery ?? "").trim());

  useEffect(() => {
    setQ(String(initialQuery ?? "").trim());
  }, [initialQuery]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const showVehicleVinRow =
    Boolean(vehicleSearchUrl) && isLikelyVin17(q);

  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (vehicleSearchUrl && isLikelyVin17(q)) {
      setOpen(true);
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/recalls/suggest?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(items);
        const vinRow = Boolean(vehicleSearchUrl) && isLikelyVin17(q);
        setOpen(items.length > 0 || vinRow);
      } catch {
        setSuggestions([]);
        setOpen(Boolean(vehicleSearchUrl) && isLikelyVin17(q));
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [q, vehicleSearchUrl]);

  const hostClass = useMemo(
    () => `${wrapperClassName || ""} search-suggest-host`.trim(),
    [wrapperClassName]
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const trimmed = q.trim();
    if (vehicleSearchUrl && isLikelyVin17(trimmed)) {
      e.preventDefault();
      const v = normalizeVinInput(trimmed);
      router.push(`${vehicleSearchUrl}?vin=${encodeURIComponent(v)}`);
    }
  }

  return (
    <form
      className={hostClass}
      action={action}
      method="get"
      role="search"
      aria-label={ariaLabel}
      onSubmit={onSubmit}
    >
      <label htmlFor="search-suggest-input" className="sr-only">
        {fieldSrLabel}
      </label>
      <input
        id="search-suggest-input"
        type="search"
        name="q"
        className={inputClassName}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
        dir={inputDir}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      <button type="submit" className={buttonClassName} aria-label={submitAriaLabel}>
        {buttonLabel}
      </button>

      {open && (
        <div
          className="search-suggest-dropdown"
          role="listbox"
          aria-label={suggestionsAriaLabel}
        >
          {showVehicleVinRow && vehicleSearchUrl && (
            <Link
              href={`${vehicleSearchUrl}?vin=${encodeURIComponent(normalizeVinInput(q))}`}
              className="search-suggest-item search-suggest-item--vehicle"
            >
              <span className="search-suggest-title">
                {vehicleSearchHint ?? "Vehicle recalls"}
              </span>
              <span className="search-suggest-meta">{vehicleSearchMeta}</span>
            </Link>
          )}
          {loading && <div className="search-suggest-empty">{loadingLabel}</div>}
          {!loading &&
            suggestions.map((s) => (
              <Link
                key={s.slug}
                href={recallDetailHref(recallsDetailBase, s.slug)}
                className="search-suggest-item"
              >
                <span className="search-suggest-title">{s.headline || s.slug}</span>
                {s.productType && <span className="search-suggest-meta">{s.productType}</span>}
              </Link>
            ))}
        </div>
      )}
    </form>
  );
}
