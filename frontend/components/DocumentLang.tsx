"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isRtlUiLang, parseLangFromPathname } from "@/lib/siteLocale";

/** Syncs `<html lang>` and `dir` with the localized URL segment. */
export default function DocumentLang() {
  const pathname = usePathname() || "/";
  const lang = parseLangFromPathname(pathname);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtlUiLang(lang) ? "rtl" : "ltr";
  }, [lang]);

  return null;
}
