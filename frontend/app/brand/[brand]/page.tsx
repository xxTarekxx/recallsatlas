import Link from "next/link";
import RecallCard from "@/components/RecallCard";
import { getDb } from "@/lib/mongodb";

interface PageProps {
  params: { brand: string };
}

export default async function BrandPage({ params }: PageProps) {
  const brandParam = decodeURIComponent(params.brand);

  let recalls: any[] = [];
  let dbError: string | null = null;

  try {
    const db = await getDb();
    recalls = await db
      .collection("recalls")
      .find({ brandName: brandParam })
      .sort({ report_date: -1 })
      .limit(200)
      .toArray();
  } catch (err: any) {
    console.error("Error loading brand recalls:", err);
    dbError = "Unable to load recalls for this brand.";
  }

  const hasRecalls = recalls.length > 0;

  return (
    <div className="brand-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>
      <main className="main-content">
        <h1>Brand: {brandParam}</h1>

        {dbError && <p className="error-message">{dbError}</p>}

        {!dbError && !hasRecalls && (
          <p className="placeholder-note">No recalls found for this brand.</p>
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
