import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { getDb } from "@/lib/mongodb";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

type BrandSummary = {
  brand: string;
  count: number;
  latest: string;
};

async function loadTopBrands(): Promise<BrandSummary[]> {
  try {
    const db = await getDb();
    const rows = (await db
      .collection("recalls")
      .find(
        { brandName: { $exists: true, $type: "string", $ne: "" } },
        { projection: { brandName: 1, report_date: 1, _id: 0 } }
      )
      .sort({ report_date: -1 })
      .limit(2000)
      .toArray()) as Array<{ brandName?: string; report_date?: string }>;

    const byBrand = new Map<string, BrandSummary>();
    for (const row of rows) {
      const brand = String(row.brandName || "").trim();
      if (!brand) continue;
      const latest = String(row.report_date || "").trim();
      const prev = byBrand.get(brand);
      byBrand.set(brand, {
        brand,
        count: (prev?.count || 0) + 1,
        latest: prev?.latest && prev.latest > latest ? prev.latest : latest,
      });
    }

    return Array.from(byBrand.values())
      .sort(
        (a, b) =>
          b.count - a.count ||
          b.latest.localeCompare(a.latest) ||
          a.brand.localeCompare(b.brand)
      )
      .slice(0, 96);
  } catch (err) {
    console.error("Error loading brand directory:", err);
    return [];
  }
}

export default async function BrandIndexPage({ uiLang }: { uiLang: SiteUiLang }) {
  const homeHref = withLangPath("/", uiLang);
  const brands = await loadTopBrands();

  return (
    <div className="directory-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content">
        <h1>Browse FDA recalls by brand</h1>
        <p className="directory-intro">
          Explore brands that appear in FDA recall notices for food, drugs,
          medical devices, and dietary supplements. Each brand page lists the
          newest recall notices first and links back to official source details
          where available. This directory highlights brands appearing in recent
          recall records.
        </p>

        {brands.length === 0 ? (
          <p className="placeholder-note">
            Brand directory is temporarily unavailable.
          </p>
        ) : (
          <section className="directory-grid" aria-label="Recall brands">
            {brands.map((row) => (
              <a
                key={row.brand}
                className="directory-card"
                href={withLangPath(`/brand/${encodeURIComponent(row.brand)}`, uiLang)}
              >
                <span className="directory-card-title">{row.brand}</span>
                <span className="directory-card-meta">
                  {row.count.toLocaleString("en-US")} recall
                  {row.count === 1 ? "" : "s"}
                </span>
                {row.latest ? (
                  <span className="directory-card-note">
                    Latest notice: {row.latest.slice(0, 10)}
                  </span>
                ) : null}
              </a>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
