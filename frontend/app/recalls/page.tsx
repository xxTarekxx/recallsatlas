import Link from "next/link";
import RecallCard from "@/components/RecallCard";
import { getDb } from "@/lib/mongodb";

const PAGE_SIZE = 50;

interface RecallsPageProps {
  searchParams?: { page?: string };
}

export default async function RecallsListPage({ searchParams }: RecallsPageProps) {
  const pageParam = searchParams?.page ?? "1";
  const page = Number.isNaN(Number(pageParam)) ? 1 : Math.max(1, parseInt(pageParam, 10));

  let recalls: any[] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    const db = await getDb();
    const collection = db.collection("recalls");
    total = await collection.countDocuments();

    recalls = await collection
      .find({})
      .sort({ report_date: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray();
  } catch (err: any) {
    console.error("Error loading recalls list:", err);
    dbError = "Unable to load recalls at the moment. Please try again later.";
  }

  const hasRecalls = recalls && recalls.length > 0;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  return (
    <div className="recalls-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>
      <main className="main-content">
        <h1>All Recalls</h1>

        {dbError && <p className="error-message">{dbError}</p>}

        {!dbError && !hasRecalls && (
          <p className="placeholder-note">No recalls available yet.</p>
        )}

        {!dbError && hasRecalls && (
          <>
            <section className="recalls-grid">
              {recalls.map((recall) => (
                <RecallCard key={recall._id.toString()} recall={recall} />
              ))}
            </section>

            <nav className="pagination">
              {page > 1 && (
                <Link
                  href={`/recalls?page=${page - 1}`}
                  className="pagination-link"
                >
                  Previous
                </Link>
              )}
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/recalls?page=${page + 1}`}
                  className="pagination-link"
                >
                  Next
                </Link>
              )}
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
