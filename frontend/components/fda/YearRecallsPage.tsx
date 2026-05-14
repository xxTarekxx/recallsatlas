import RecallCard from "@/components/fda/RecallCard";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { getDb } from "@/lib/mongodb";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";
import { notFound } from "next/navigation";

type Props = {
  yearParam: string;
  uiLang: SiteUiLang;
};

export default async function YearRecallsPage({ yearParam, uiLang }: Props) {
  let recalls: unknown[] = [];
  let dbError: string | null = null;
  const normalizedYear = String(yearParam || "").trim();

  if (!/^\d{4}$/.test(normalizedYear)) {
    notFound();
  }

  try {
    const db = await getDb();
    recalls = await db
      .collection("recalls")
      .find({ report_date: { $regex: `^${normalizedYear}` } })
      .sort({ report_date: -1 })
      .limit(500)
      .toArray();
  } catch (err: unknown) {
    console.error("Error loading year recalls:", err);
    dbError = "Unable to load recalls for this year.";
  }

  const hasRecalls = recalls.length > 0;
  const homeHref = withLangPath("/", uiLang);

  if (!dbError && !hasRecalls) {
    notFound();
  }

  return (
    <div className="year-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content">
        <h1>Year: {normalizedYear}</h1>

        {dbError && <p className="error-message">{dbError}</p>}

        {!dbError && hasRecalls && (
          <section className="recalls-grid">
            {recalls.map((recall) => (
              <RecallCard
                key={(recall as { _id: unknown })._id?.toString()}
                recall={recall}
                uiLang={uiLang}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
