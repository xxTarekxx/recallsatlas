import Link from "next/link";
import RecallCard from "@/components/RecallCard";
import { getDb } from "@/lib/mongodb";

interface PageProps {
  params: { category: string };
}

export default async function CategoryPage({ params }: PageProps) {
  const categoryParam = decodeURIComponent(params.category);

  let recalls: any[] = [];
  let dbError: string | null = null;

  try {
    const db = await getDb();
    recalls = await db
      .collection("recalls")
      .find({ category: categoryParam })
      .sort({ report_date: -1 })
      .limit(200)
      .toArray();
  } catch (err: any) {
    console.error("Error loading category recalls:", err);
    dbError = "Unable to load recalls for this category.";
  }

  const hasRecalls = recalls.length > 0;

  return (
    <div className="category-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
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
              <RecallCard key={recall._id.toString()} recall={recall} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
