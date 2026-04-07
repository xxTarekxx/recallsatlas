import type { Metadata } from "next";
import type { GeneralRecall } from "./general-recalls-data";
import { getGeneralRecallSlug, mergeGeneralRecallForUiLang } from "./general-recalls-data";
import { isSiteUiLang, withLocalePath, type SiteUiLang } from "./siteLocale";

const SITE = "https://www.recallsatlas.com";

export function trimPlainText(text: unknown, max: number): string {
  const s = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** First site-relative `/images/...` from recall images → absolute URL for OG/Twitter. */
export function absoluteOgImageFromRecall(recall: GeneralRecall): string | undefined {
  for (const im of recall.Images || []) {
    const u = im?.URL;
    if (typeof u === "string" && u.startsWith("/images/")) {
      return `${SITE}${u}`;
    }
  }
  return undefined;
}

function recallDescriptionForMeta(recall: GeneralRecall): string {
  const override = recall.metaDescription ?? recall.seo?.metaDescription;
  if (typeof override === "string" && override.trim()) return override.trim().slice(0, 160);
  return trimPlainText(recall.Description, 160);
}

function canonicalPathForLang(slug: string, lang: SiteUiLang): string {
  return withLocalePath(`/general-recalls/${encodeURIComponent(slug)}`, lang);
}

export function buildGeneralRecallMetadata(
  recall: GeneralRecall,
  lang: string
): Metadata | { title: string } {
  const slug = getGeneralRecallSlug(recall);
  if (!slug) {
    return { title: "Recall not found – Recalls Atlas" };
  }

  const uiLang: SiteUiLang = isSiteUiLang(lang) ? lang : "en";
  const display = mergeGeneralRecallForUiLang(recall, uiLang);
  const titleText = display.Title?.trim() || "Product recall";
  const description = recallDescriptionForMeta(display);
  const canonical = `${SITE}${canonicalPathForLang(slug, uiLang)}`;
  const ogImage = absoluteOgImageFromRecall(recall);

  const openGraph: Metadata["openGraph"] = {
    title: titleText,
    description,
    url: canonical,
    type: "article",
    ...(ogImage ? { images: [{ url: ogImage, alt: titleText }] } : {}),
  };

  const twitter: Metadata["twitter"] = {
    card: "summary_large_image",
    title: titleText,
    description,
    ...(ogImage ? { images: [ogImage] } : {}),
  };

  return {
    title: titleText,
    description,
    alternates: { canonical },
    openGraph,
    twitter,
  };
}
