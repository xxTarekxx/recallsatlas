 "use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getShortRecallTitle } from "@/lib/recall-utils";
import RecallDetailImageSlider from "./RecallDetailImageSlider";

/** Format YYYYMMDD as MM/DD/YYYY */
function formatDate(yyyymmdd?: string) {
  if (!yyyymmdd || typeof yyyymmdd !== "string" || yyyymmdd.length !== 8) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${m}/${d}/${y}`;
}

function hasHtml(text: string) {
  return /<(?:\w+|table|ul|ol|li|p|a\s)/i.test(text || "");
}

export interface RecallDetailProps {
  recall: any;
  dbError?: string | null;
  currentLang?: string;
}

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", flag: "/images/flags/us.svg" },
  { code: "es", label: "Spanish", flag: "/images/flags/es.svg" },
  { code: "de", label: "German", flag: "/images/flags/de.svg" },
  { code: "ja", label: "Japanese", flag: "/images/flags/jp.svg" },
  { code: "fr", label: "French", flag: "/images/flags/fr.svg" },
  { code: "pt", label: "Portuguese", flag: "/images/flags/br.svg" },
  { code: "ru", label: "Russian", flag: "/images/flags/ru.svg" },
  { code: "it", label: "Italian", flag: "/images/flags/it.svg" },
  { code: "nl", label: "Dutch", flag: "/images/flags/nl.svg" },
  { code: "pl", label: "Polish", flag: "/images/flags/pl.svg" },
  { code: "tr", label: "Turkish", flag: "/images/flags/tr.svg" },
  { code: "fa", label: "Persian", flag: "/images/flags/ir.svg" },
  { code: "zh", label: "Chinese", flag: "/images/flags/cn.svg" },
  { code: "vi", label: "Vietnamese", flag: "/images/flags/vn.svg" },
  { code: "id", label: "Indonesian", flag: "/images/flags/id.svg" },
  { code: "cs", label: "Czech", flag: "/images/flags/cz.svg" },
  { code: "ko", label: "Korean", flag: "/images/flags/kr.svg" },
  { code: "uk", label: "Ukrainian", flag: "/images/flags/ua.svg" },
  { code: "hu", label: "Hungarian", flag: "/images/flags/hu.svg" },
  { code: "ar", label: "Arabic", flag: "/images/flags/sa.svg" },
];

/**
 * Renders a single recall detail view. Works for any recall from MongoDB
 * (with or without content[]). Use on /recalls/[slug].
 */
export default function RecallDetail({ recall, dbError = null, currentLang = "en" }: RecallDetailProps) {
  if (!recall && !dbError) return null;

  const router = useRouter();
  const pathname = usePathname();
  const [selectedLang, setSelectedLang] = useState(currentLang);
  const translatedByCode = recall?.languages && typeof recall.languages === "object" ? recall.languages : {};
  const activeLangObj = translatedByCode[selectedLang] || translatedByCode.en || {};
  const activeDir = activeLangObj?.dir || "ltr";
  const supportedCodes = useMemo(() => new Set(LANGUAGE_OPTIONS.map((l) => l.code)), []);
  const isLanguageAvailable = (langCode: string) => langCode === "en" || Boolean(translatedByCode[langCode]);
  const selectedLanguageMissing = selectedLang !== "en" && !translatedByCode[selectedLang];

  useEffect(() => {
    setSelectedLang(currentLang);
  }, [currentLang]);

  const makeLocalizedPath = (targetLang: string) => {
    const parts = (pathname || "/").split("/").filter(Boolean);
    if (parts.length > 0 && supportedCodes.has(parts[0])) {
      parts[0] = targetLang;
      return `/${parts.join("/")}`;
    }
    return `/${targetLang}${pathname || ""}`;
  };

  const switchLanguage = (langCode: string) => {
    setSelectedLang(langCode);
    const nextPath = makeLocalizedPath(langCode);
    router.push(nextPath, { scroll: false });
  };

  const product = activeLangObj?.productDescription || recall?.productDescription || "";
  const year =
    typeof recall?.report_date === "string" ? recall.report_date.slice(0, 4) : "";
  const shortTitle = getShortRecallTitle(product, year);
  const fullTitle = activeLangObj?.title || recall?.title || shortTitle;
  const singleImage = typeof recall?.image === "object" ? recall?.image?.url : recall?.image;
  const imagesArray = Array.isArray(recall?.images) ? recall.images : [];
  const imageUrls = imagesArray.length > 0 ? imagesArray : (singleImage ? [singleImage] : []);
  const hasImages = imageUrls.length > 0;
  const brand = activeLangObj?.brandName || recall?.brandName || "";
  const company = recall?.companyName || "";
  const reason = activeLangObj?.reason || recall?.reason || "";
  const reportDate = formatDate(recall?.report_date);
  const classification = recall?.classification || "";
  const distribution = recall?.distribution || "";
  const productType = activeLangObj?.productType || recall?.productType || "";
  const sourceUrl = recall?.source_url || "";
  const rawContent = Array.isArray(activeLangObj?.content)
    ? activeLangObj.content
    : (Array.isArray(recall?.content) ? recall.content : []);
  const whatWasRecalledSection = rawContent.find(
    (s: any) => (s?.subtitle || "").toLowerCase().includes("what was recalled")
  );
  const officialSourceSection = rawContent.find(
    (s: any) => (s?.subtitle || "").toLowerCase().includes("official source")
  );
  const content = rawContent.filter((s: any) => {
    const subtitle = (s?.subtitle || "").toLowerCase();
    return (
      !subtitle.includes("official source") &&
      !subtitle.includes("what was recalled") &&
      !subtitle.includes("reason for recall")
    );
  });
  const disclaimer = activeLangObj?.disclaimer || recall?.disclaimer || "";
  const isTerminated = recall?.terminated === true;
  const wwrFacts =
    whatWasRecalledSection?.facts && typeof whatWasRecalledSection.facts === "object"
      ? whatWasRecalledSection.facts
      : {};

  const detailCompany = wwrFacts.company || company;
  const detailBrand = wwrFacts.brand || brand;
  const detailProduct = wwrFacts.product || product;
  const detailProductType = wwrFacts.productType || productType;

  const statusValue = (
    <span
      className={`recall-detail-status-value recall-detail-status-value--${isTerminated ? "terminated" : "ongoing"}`}
    >
      {isTerminated ? "Terminated" : "Ongoing"}
    </span>
  );

  return (
    <div className="recall-detail-page" dir={activeDir}>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-title">
            RecallsAtlas
          </Link>
          <Link href="/recalls" className="site-header-back">
            ← All recalls
          </Link>
        </div>
      </header>

      <main className="main-content recall-detail-main">
        {dbError && (
          <div className="recall-detail-error" role="alert">
            {dbError}
          </div>
        )}

        <article className="recall-detail-article">
          <div className="recall-detail-hero">
            <p className="recall-detail-badge">FDA Safety Alert</p>
            <h1 className="recall-detail-title">{fullTitle}</h1>
            <div className="recall-language-switcher">
              <div className="recall-language-switcher-head">
                <label htmlFor="recall-language" className="recall-language-label">
                  Language
                </label>
                <span className="recall-language-current">
                  {LANGUAGE_OPTIONS.find((l) => l.code === selectedLang)?.label || "English"}
                </span>
              </div>
              <select
                id="recall-language"
                className="recall-language-select"
                value={selectedLang}
                onChange={(e) => switchLanguage(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.code} value={lang.code} disabled={!isLanguageAvailable(lang.code)}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedLanguageMissing && (
              <p className="recall-language-note">
                This language is not available for this recall yet. Showing English.
              </p>
            )}
            <div className="recall-language-flags" role="group" aria-label="Language options">
              {LANGUAGE_OPTIONS.map((lang) => {
                const unavailable = !isLanguageAvailable(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => switchLanguage(lang.code)}
                    disabled={unavailable}
                    aria-label={`Switch to ${lang.label}`}
                    title={unavailable ? `${lang.label} (not available yet)` : lang.label}
                    className={`recall-language-flag-btn${
                      selectedLang === lang.code ? " recall-language-flag-btn--active" : ""
                    }${unavailable ? " recall-language-flag-btn--disabled" : ""}`}
                  >
                    <img src={lang.flag} alt="" width={22} height={16} />
                  </button>
              )})}
            </div>
            {disclaimer && (
              <p className="recall-detail-disclaimer">{disclaimer}</p>
            )}
          </div>

          {hasImages && (
            <RecallDetailImageSlider imageUrls={imageUrls} alt={shortTitle} />
          )}

          <section className="recall-detail-facts" aria-label="Recall details">
            <div className="recall-detail-facts-head">
              <h2 className="recall-detail-facts-title">Recall Details</h2>
              <p className="recall-detail-status-row">
                <span className="recall-detail-status-label">Status</span>
                {statusValue}
              </p>
            </div>
            <dl className="recall-detail-dl">
              {detailProduct && (
                <>
                  <dt className="recall-fact-label recall-fact-label--product">Product</dt>
                  <dd className="recall-fact-value recall-fact-value--product">{detailProduct}</dd>
                </>
              )}
              {detailProductType && (
                <>
                  <dt>Product type</dt>
                  <dd>{detailProductType}</dd>
                </>
              )}
              {detailBrand && (
                <>
                  <dt>Brand</dt>
                  <dd>{detailBrand}</dd>
                </>
              )}
              {detailCompany && (
                <>
                  <dt>Company</dt>
                  <dd>{detailCompany}</dd>
                </>
              )}
              {reportDate && (
                <>
                  <dt>Recall date</dt>
                  <dd>{reportDate}</dd>
                </>
              )}
              {classification && (
                <>
                  <dt>Classification</dt>
                  <dd>{classification}</dd>
                </>
              )}
              {distribution && (
                <>
                  <dt>Distribution</dt>
                  <dd>{distribution}</dd>
                </>
              )}
              {reason && (
                <>
                  <dt>The Reason For Recall</dt>
                  <dd>{reason}</dd>
                </>
              )}
            </dl>
          </section>

          {content.length > 0 && (
            <div className="recall-detail-content">
              {content.map((section: any, i: number) => (
                <section key={i} className="recall-detail-content-section">
                  <h2 className="recall-detail-content-section-title">{section.subtitle}</h2>
                  {section.text &&
                    (hasHtml(section.text) ? (
                      <div
                        className="recall-content-html recall-detail-content-section-body"
                        dangerouslySetInnerHTML={{ __html: section.text }}
                      />
                    ) : (
                      <div className="recall-detail-content-section-body">
                        <p>{section.text}</p>
                      </div>
                    ))}
                  {section.authorityLinks && section.authorityLinks.length > 0 && (
                    <div
                      className="recall-detail-authority-links"
                      dangerouslySetInnerHTML={{
                        __html: section.authorityLinks.join(" "),
                      }}
                    />
                  )}
                </section>
              ))}
            </div>
          )}

          {(sourceUrl || officialSourceSection) && (
            <section
              className="recall-detail-sources"
              id="official-sources"
              aria-labelledby="recall-official-sources-heading"
            >
              <h2 id="recall-official-sources-heading" className="recall-detail-facts-title">
                Official sources
              </h2>
              {officialSourceSection?.text && (
                <p className="recall-detail-sources-publish">
                  {officialSourceSection.text}
                </p>
              )}
              {officialSourceSection?.authorityLinks?.length > 0 && (
                <div
                  className="recall-detail-authority-links"
                  dangerouslySetInnerHTML={{
                    __html: officialSourceSection.authorityLinks.join(" "),
                  }}
                />
              )}
              {sourceUrl && (
                <p className="recall-detail-sources-link-wrap">
                  <a
                    href={sourceUrl}
                    className="recall-detail-sources-primary-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    title={sourceUrl}
                  >
                    View FDA recall notice
                    <span className="recall-detail-sources-link-icon" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </p>
              )}
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
