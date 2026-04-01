"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { NAV_COPY } from "@/lib/navCopy";
import {
  SITE_UI_LANG_FLAG_SRC,
  SITE_UI_LANG_LABELS_EN,
  SITE_UI_LANGS_ALPHABETICAL,
  parseLangFromPathname,
  pathForLang,
  type SiteUiLang,
} from "@/lib/siteLocale";

function LangFlag({ lang, className }: { lang: SiteUiLang; className?: string }) {
  return (
    <img
      src={SITE_UI_LANG_FLAG_SRC[lang]}
      alt=""
      width={22}
      height={16}
      className={className}
      decoding="async"
    />
  );
}

type Props = {
  className?: string;
};

export default function NavLanguageSelect({ className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const current = parseLangFromPathname(pathname);
  const t = NAV_COPY[current];
  const listId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  const pick = (next: SiteUiLang) => {
    const dest = pathForLang(pathname, next);
    router.push(dest);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`sitenav-lang-picker${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className="sitenav-lang-trigger"
        aria-label={`${t.language}: ${SITE_UI_LANG_LABELS_EN[current]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listId}-menu`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sitenav-lang-trigger-inner">
          <LangFlag lang={current} className="sitenav-lang-flag-img" />
          <span className="sitenav-lang-trigger-text">
            {SITE_UI_LANG_LABELS_EN[current]}
          </span>
        </span>
        <span className="sitenav-lang-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={`${listId}-menu`}
          className="sitenav-lang-menu"
          role="listbox"
          aria-label={t.language}
        >
          {SITE_UI_LANGS_ALPHABETICAL.map((code) => (
            <li key={code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={current === code}
                className={`sitenav-lang-item${
                  current === code ? " sitenav-lang-item--active" : ""
                }`}
                onClick={() => pick(code)}
              >
                <LangFlag lang={code} className="sitenav-lang-flag-img" />
                <span>{SITE_UI_LANG_LABELS_EN[code]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
