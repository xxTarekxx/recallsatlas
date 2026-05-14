import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { getDb } from "@/lib/mongodb";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

type YearSummary = {
  year: string;
  count: number;
  latest: string;
};

async function loadRecallYears(): Promise<YearSummary[]> {
  try {
    const db = await getDb();
    const rows = (await db
      .collection("recalls")
      .aggregate([
        {
          $match: {
            report_date: { $exists: true, $type: "string", $regex: "^\\d{4}" },
          },
        },
        {
          $group: {
            _id: { $substr: ["$report_date", 0, 4] },
            count: { $sum: 1 },
            latest: { $max: "$report_date" },
          },
        },
        { $sort: { _id: -1 } },
      ])
      .toArray()) as Array<{ _id: string; count: number; latest?: string }>;

    return rows
      .map((row) => ({
        year: String(row._id || "").trim(),
        count: Number(row.count || 0),
        latest: String(row.latest || "").trim(),
      }))
      .filter((row) => /^\d{4}$/.test(row.year) && row.count > 0);
  } catch (err) {
    console.error("Error loading year directory:", err);
    return [];
  }
}

export default async function YearIndexPage({ uiLang }: { uiLang: SiteUiLang }) {
  const homeHref = withLangPath("/", uiLang);
  const years = await loadRecallYears();

  return (
    <div className="directory-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content">
        <h1>Browse FDA recalls by year</h1>
        <p className="directory-intro">
          Use this directory to review FDA recall notices by report year. Each
          year page groups current food, drug, medical device, and supplement
          recalls into a searchable archive ordered from newest to oldest.
        </p>

        {years.length === 0 ? (
          <p className="placeholder-note">
            Year directory is temporarily unavailable.
          </p>
        ) : (
          <section className="directory-grid directory-grid--compact" aria-label="Recall years">
            {years.map((row) => (
              <a
                key={row.year}
                className="directory-card"
                href={withLangPath(`/year/${encodeURIComponent(row.year)}`, uiLang)}
              >
                <span className="directory-card-title">{row.year}</span>
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
