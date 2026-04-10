import Link from "next/link";
import GeneralRecallCategoryTag from "@/components/general-recalls/GeneralRecallCategoryTag";
import RecallDetailImageSlider from "@/components/fda/RecallDetailImageSlider";
import type { GeneralRecall } from "@/lib/general-recalls-data";
import { getGeneralRecallContentDir, mergeGeneralRecallForUiLang } from "@/lib/general-recalls-data";
import { GENERAL_RECALL_DETAIL_SECTIONS_UI } from "@/lib/generalRecallDetailSectionsUi";
import { withLangPath, type SiteUiLang } from "@/lib/siteLocale";

const listStyle = { paddingInlineStart: "1.25rem", color: "#334155" } as const;

type Props = {
  recall: GeneralRecall;
  lang: SiteUiLang;
};

export default function GeneralRecallDetail({ recall, lang }: Props) {
  const r = mergeGeneralRecallForUiLang(recall, lang);
  const contentDir = getGeneralRecallContentDir(recall, lang);
  const categoryKey =
    (typeof recall.sourceCategoryKey === "string" && recall.sourceCategoryKey.trim()) ||
    (typeof recall.primaryCategorySlug === "string" && recall.primaryCategorySlug.trim()) ||
    (Array.isArray(recall.categorySlugs)
      ? recall.categorySlugs.find((value) => typeof value === "string" && value.trim()) || ""
      : "");
  const sec = GENERAL_RECALL_DETAIL_SECTIONS_UI[lang] ?? GENERAL_RECALL_DETAIL_SECTIONS_UI.en;
  const title = r.Title || "Product recall";
  const cpscUrl = typeof recall.URL === "string" ? recall.URL : "";
  const localImages = r.Images?.filter((im) => im.URL?.startsWith("/images/")) ?? [];

  return (
    <div className="recall-detail-page">
      <header className="site-header">
        <div className="site-header-inner" style={{ padding: "0.75rem 1rem" }}>
          <Link href={withLangPath("/", lang)} className="site-header-back">
            ← Home
          </Link>
        </div>
      </header>

      <main className="recall-detail-main">
        <article className="recall-detail-article" dir={contentDir} lang={lang}>
          <div className="recall-detail-hero">
            <div className="recall-detail-hero-badges">
              <span className="recall-detail-badge">CPSC product recall</span>
              {categoryKey ? (
                <GeneralRecallCategoryTag
                  categoryKey={categoryKey}
                  className="recall-detail-category-tag"
                />
              ) : null}
            </div>
            {recall.RecallNumber && (
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#64748b" }}>
                Recall #{recall.RecallNumber}
                {recall.RecallDate && (
                  <>
                    {" "}
                    · {String(recall.RecallDate).slice(0, 10)}
                  </>
                )}
              </p>
            )}
            <h1 className="recall-detail-title">{title}</h1>
          </div>

          <div style={{ padding: "var(--spacing-lg)" }}>
            {r.Description && (
              <section style={{ marginBottom: "1.5rem" }}>
                {r.Description.split(/\n\n+/).map((para, i) => (
                  <p key={i} style={{ lineHeight: 1.6, marginBottom: "1rem", color: "#334155" }}>
                    {para}
                  </p>
                ))}
              </section>
            )}

            {r.Products && r.Products.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{sec.products}</h2>
                <ul style={listStyle}>
                  {r.Products.map((p, i) => (
                    <li key={i} style={{ marginBottom: "0.35rem" }}>
                      <strong>{p.Name || sec.productFallback}</strong>
                      {p.NumberOfUnits && ` — ${p.NumberOfUnits}`}
                      {p.Model && ` (${sec.modelPrefix}${p.Model})`}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {localImages.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{sec.images}</h2>
                <RecallDetailImageSlider
                  imageUrls={localImages.map((im) => im.URL!)}
                  alt={title}
                />
                {localImages.some((im) => im.Caption) && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#64748b" }}>
                    {localImages.length === 1 && localImages[0].Caption ? (
                      <p style={{ margin: 0 }}>{localImages[0].Caption}</p>
                    ) : (
                      <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
                        {localImages.map(
                          (im, i) =>
                            im.Caption && <li key={i}>{im.Caption}</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            )}

            {r.Hazards && r.Hazards.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{sec.hazards}</h2>
                <ul style={listStyle}>
                  {r.Hazards.map((h, i) => (
                    <li key={i}>{h.Name}</li>
                  ))}
                </ul>
              </section>
            )}

            {r.Remedies && r.Remedies.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{sec.remedy}</h2>
                <ul style={listStyle}>
                  {r.Remedies.map((rem, i) => (
                    <li key={i}>{rem.Name}</li>
                  ))}
                </ul>
              </section>
            )}

            {r.Retailers && r.Retailers.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{sec.soldAt}</h2>
                <ul style={listStyle}>
                  {r.Retailers.map((ret, i) => (
                    <li key={i}>{ret.Name}</li>
                  ))}
                </ul>
              </section>
            )}

            {r.ConsumerContact && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{sec.consumerContact}</h2>
                <p style={{ lineHeight: 1.6, color: "#334155" }}>{r.ConsumerContact}</p>
              </section>
            )}

            {cpscUrl && (
              <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                Official notice:{" "}
                <a href={cpscUrl} target="_blank" rel="noopener noreferrer">
                  CPSC recall page
                </a>
              </p>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
