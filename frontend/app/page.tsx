import Link from "next/link";
import RecallCard from "@/components/RecallCard";
import { getDb } from "@/lib/mongodb";

export default async function HomePage() {
  const categories = ["Drugs", "Food", "Medical Devices", "Supplements"];

  let latestRecalls: any[] = [];
  let dbError: string | null = null;

  try {
    const db = await getDb();
    const collection = db.collection("recalls");
    latestRecalls = await collection
      .find({})
      .sort({ report_date: -1 })
      .limit(20)
      .toArray();
  } catch (err: any) {
    console.error("Error loading latest recalls for homepage:", err);
    dbError = "Latest recalls are temporarily unavailable.";
  }

  return (
    <div className="homepage">
      <header className="site-header">
        <h1 className="site-title">
          <Link href="/">RecallsAtlas</Link>
        </h1>
      </header>

      <main className="main-content">
        <section className="hero">
          <h2>FDA Recall Data</h2>
          <p>Search and browse recall information from the FDA database.</p>
        </section>

        <section className="search-section">
          <form className="search-bar" action="/recalls" method="get">
            <input
              type="search"
              name="q"
              placeholder="Search recalls..."
              className="search-input"
              aria-label="Search recalls"
            />
            <button type="submit" className="search-btn">
              Search
            </button>
          </form>
        </section>

        <section className="browse-section">
          <h3>Browse by Category</h3>
          <ul className="category-list">
            {categories.map((cat) => (
              <li key={cat}>
                <Link href={`/category/${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="browse-section">
          <h3>Browse by Brand</h3>
          <p className="placeholder-note">
            <Link href="/brand">View all brands</Link>
          </p>
        </section>

        <section className="browse-section">
          <h3>Browse by Year</h3>
          <p className="placeholder-note">
            <Link href="/year">View by year</Link>
          </p>
        </section>

        <section className="latest-section">
          <h3>Latest FDA Recalls</h3>

          {dbError && <p className="error-message">{dbError}</p>}

          {!dbError && latestRecalls.length === 0 && (
            <p className="placeholder-note">No recalls available yet.</p>
          )}

          {!dbError && latestRecalls.length > 0 && (
            <div className="recalls-grid">
              {latestRecalls.map((recall) => (
                <RecallCard key={recall._id.toString()} recall={recall} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>&copy; RecallsAtlas. FDA recall data aggregated for public use.</p>
      </footer>
    </div>
  );
}
