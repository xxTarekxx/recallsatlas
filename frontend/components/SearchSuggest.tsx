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
  /** When set, a valid 17-char VIN submits here instead of FDA search. */
  vehicleSearchUrl?: string;
  vehicleSearchHint?: string;
};

export default function SearchSuggest({
  action,
  inputClassName,
  buttonClassName,
  wrapperClassName,
  placeholder = "Search recalls...",
  ariaLabel = "Search recalls",
}: SearchSuggestProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

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
        setOpen(items.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [q]);

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
        Search recalls by headline or product type
      </label>
      <input
        id="search-suggest-input"
        type="search"
        name="q"
        className={inputClassName}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      <button type="submit" className={buttonClassName} aria-label="Submit search">
        Search
      </button>

      {open && (
        <div className="search-suggest-dropdown" role="listbox" aria-label="Suggestions">
          {showVehicleVinRow && vehicleSearchUrl && (
            <Link
              href={`${vehicleSearchUrl}?vin=${encodeURIComponent(normalizeVinInput(q))}`}
              className="search-suggest-item search-suggest-item--vehicle"
            >
              <span className="search-suggest-title">
                {vehicleSearchHint ?? "Vehicle recalls"}
              </span>
              <span className="search-suggest-meta">VIN · NHTSA</span>
            </Link>
          )}
          {loading && <div className="search-suggest-empty">Loading...</div>}
          {!loading &&
            suggestions.map((s) => (
              <Link
                key={s.slug}
                href={`/recalls/${s.slug}`}
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
