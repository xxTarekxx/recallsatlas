import Link from "next/link";
import RecallCard from "@/components/RecallCard";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { getDb } from "@/lib/mongodb";

interface PageProps {
  params: { year: string };
}

export default async function YearPage({ params }: PageProps) {
  const yearParam = params.year;

  let recalls: any[] = [];
  let dbError: string | null = null;

  try {
    const db = await getDb();
    recalls = await db
      .collection("recalls")
      .find({ report_date: { $regex: `^${yearParam}` } })
      .sort({ report_date: -1 })
      .limit(500)
      .toArray();
  } catch (err: any) {
    console.error("Error loading year recalls:", err);
    dbError = "Unable to load recalls for this year.";
  }

  const hasRecalls = recalls.length > 0;

  return (
    <div className="year-page">
      <header className="site-header">
        <SiteBrandLogoLink />
      </header>
      <main className="main-content">
        <h1>Year: {yearParam}</h1>

        {dbError && <p className="error-message">{dbError}</p>}

        {!dbError && !hasRecalls && (
          <p className="placeholder-note">No recalls found for this year.</p>
        )}

        {!dbError && hasRecalls && (
          <section className="recalls-grid">
            {recalls.map((recall) => (
              <RecallCard key={recall._id.toString()} recall={recall} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
