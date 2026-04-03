import Link from "next/link";
import Image from "next/image";
import type { GeneralRecall } from "@/lib/general-recalls-data";
import { withLangPath, type SiteUiLang } from "@/lib/siteLocale";

type Props = {
  recall: GeneralRecall;
  lang: SiteUiLang;
};

export default function GeneralRecallDetail({ recall, lang }: Props) {
  const title = recall.Title || "Product recall";
  const cpscUrl = typeof recall.URL === "string" ? recall.URL : "";

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
        <article className="recall-detail-article">
          <div className="recall-detail-hero">
            <span className="recall-detail-badge">CPSC product recall</span>
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
            {recall.Description && (
              <section style={{ marginBottom: "1.5rem" }}>
                {recall.Description.split(/\n\n+/).map((para, i) => (
                  <p key={i} style={{ lineHeight: 1.6, marginBottom: "1rem", color: "#334155" }}>
                    {para}
                  </p>
                ))}
              </section>
            )}

            {recall.Products && recall.Products.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Products</h2>
                <ul style={{ paddingLeft: "1.25rem", color: "#334155" }}>
                  {recall.Products.map((p, i) => (
                    <li key={i} style={{ marginBottom: "0.35rem" }}>
                      <strong>{p.Name || "Product"}</strong>
                      {p.NumberOfUnits && ` — ${p.NumberOfUnits}`}
                      {p.Model && ` (Model: ${p.Model})`}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recall.Images && recall.Images.some((im) => im.URL?.startsWith("/images/")) && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Images</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                  {recall.Images.filter((im) => im.URL?.startsWith("/images/")).map((im, i) => (
                    <figure key={i} style={{ margin: 0, maxWidth: "280px" }}>
                      <Image
                        src={im.URL!}
                        alt={im.Caption || title}
                        width={280}
                        height={280}
                        style={{ width: "100%", height: "auto", borderRadius: 8 }}
                      />
                      {im.Caption && (
                        <figcaption style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
                          {im.Caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {recall.Hazards && recall.Hazards.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Hazards</h2>
                <ul style={{ paddingLeft: "1.25rem", color: "#334155" }}>
                  {recall.Hazards.map((h, i) => (
                    <li key={i}>{h.Name}</li>
                  ))}
                </ul>
              </section>
            )}

            {recall.Remedies && recall.Remedies.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Remedy</h2>
                <ul style={{ paddingLeft: "1.25rem", color: "#334155" }}>
                  {recall.Remedies.map((r, i) => (
                    <li key={i}>{r.Name}</li>
                  ))}
                </ul>
              </section>
            )}

            {recall.Retailers && recall.Retailers.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Sold at</h2>
                <ul style={{ paddingLeft: "1.25rem", color: "#334155" }}>
                  {recall.Retailers.map((r, i) => (
                    <li key={i}>{r.Name}</li>
                  ))}
                </ul>
              </section>
            )}

            {recall.ConsumerContact && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Consumer contact</h2>
                <p style={{ lineHeight: 1.6, color: "#334155" }}>{recall.ConsumerContact}</p>
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
