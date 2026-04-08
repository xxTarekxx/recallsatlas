import Link from "next/link";
import { notFound } from "next/navigation";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import path from "path";
import fs from "fs";
const RECALLS_JSON_PATH = path.join(process.cwd(), "..", "backend", "data", "recalls.json");

interface PageProps {
  params: Promise<{ id: string }>;
}

function getRecallById(id: string) {
  if (fs.existsSync(RECALLS_JSON_PATH)) {
    const raw = fs.readFileSync(RECALLS_JSON_PATH, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const recall = data.find((r: any) => r.id === id);
      return recall ?? null;
    }
  }
  return null;
}

export default async function RecallPreviewPage({ params }: PageProps) {
  const { id } = await params;
  const recall = getRecallById(id);
  if (!recall) notFound();

  const content = recall.content || [];
  const hasHtml = (t: string) => /<(?:\w+|table|ul|ol|li|p|a\s)/i.test(t || "");

  return (
    <div className="recall-detail-page">
      <header className="site-header">
        <SiteBrandLogoLink />
        <span style={{ marginLeft: "1rem", fontSize: "0.9rem", color: "#666" }}>
          (Preview from recalls.json)
        </span>
      </header>
      <main className="main-content recall-detail" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1>{recall.headline || recall.title}</h1>
        {recall.disclaimer && (
          <p className="recall-detail-subtitle" style={{ color: "#666", fontSize: "0.95rem" }}>
            {recall.disclaimer}
          </p>
        )}
        {recall.datePublished && (
          <p style={{ marginBottom: "1rem" }}>
            <strong>Published:</strong> {recall.datePublished}
          </p>
        )}
        {recall.companyName && (
          <p>
            <strong>Company:</strong> {recall.companyName}
          </p>
        )}
        {recall.brandName && (
          <p>
            <strong>Brand:</strong> {recall.brandName}
          </p>
        )}
        {recall.reason && (
          <p>
            <strong>Reason:</strong> {recall.reason}
          </p>
        )}

        <div style={{ marginTop: "2rem" }}>
          {content.map((section: any, i: number) => (
            <section key={i} style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {section.subtitle}
              </h2>
              {section.text &&
                (hasHtml(section.text) ? (
                  <div
                    className="recall-content-html"
                    dangerouslySetInnerHTML={{ __html: section.text }}
                    style={{
                      lineHeight: 1.6,
                    }}
                  />
                ) : (
                  <p style={{ whiteSpace: "pre-wrap" }}>{section.text}</p>
                ))}
              {section.authorityLinks && section.authorityLinks.length > 0 && (
                <div
                  className="authority-links"
                  dangerouslySetInnerHTML={{
                    __html: section.authorityLinks.join(" "),
                  }}
                  style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}
                />
              )}
            </section>
          ))}
        </div>

        <p style={{ marginTop: "2rem" }}>
          <Link href="/recalls">← Back to recalls</Link>
        </p>
      </main>
    </div>
  );
}
