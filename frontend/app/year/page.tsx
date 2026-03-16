import Link from "next/link";

export default function YearIndexPage() {
  return (
    <div className="year-index-page">
      <header className="site-header">
        <Link href="/" className="site-title">RecallsAtlas</Link>
      </header>
      <main className="main-content">
        <h1>Browse by Year</h1>
        <p className="placeholder-note">
          Year list will be populated from MongoDB.
        </p>
      </main>
    </div>
  );
}
