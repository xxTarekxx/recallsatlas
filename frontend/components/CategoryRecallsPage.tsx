import RecallCard from "@/components/RecallCard";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { getDb } from "@/lib/mongodb";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

type Props = {
  categoryParam: string;
  uiLang: SiteUiLang;
};

export default async function CategoryRecallsPage({ categoryParam, uiLang }: Props) {
  let recalls: unknown[] = [];
  let dbError: string | null = null;

  try {
    const db = await getDb();
    recalls = await db
      .collection("recalls")
      .find({ productType: categoryParam })
      .sort({ report_date: -1 })
      .limit(200)
      .toArray();
  } catch (err: unknown) {
    console.error("Error loading category recalls:", err);
    dbError = "Unable to load recalls for this category.";
  }

  const hasRecalls = recalls.length > 0;
  const homeHref = withLangPath("/", uiLang);

  return (
    <div className="category-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content">
        <h1>Category: {categoryParam}</h1>

        {dbError && <p className="error-message">{dbError}</p>}

        {!dbError && !hasRecalls && (
          <p className="placeholder-note">No recalls found for this category.</p>
        )}

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
