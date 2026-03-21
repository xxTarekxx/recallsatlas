import Link from "next/link";

export default function HomePage() {
  return (
    <div className="homepage">
      <header className="site-header">
        <h1 className="site-title">
          <Link href="/">RecallsAtlas</Link>
        </h1>
      </header>

      <main className="main-content landing-main">
        <section className="hero">
          <h2>Recall Data</h2>
          <p>Choose a category to search and browse recalls.</p>
        </section>

        <section className="recall-choices">
          <Link href="/recalls" className="recall-choice-card recall-choice-fda">
            <span className="recall-choice-icon" aria-hidden="true">FDA</span>
            <h3>FDA Recalls</h3>
            <p>Drugs, food, medical devices, supplements</p>
          </Link>
          <Link href="/recalls/vehicles" className="recall-choice-card recall-choice-vehicles">
            <span className="recall-choice-icon" aria-hidden="true">NHTSA</span>
            <h3>Vehicle Recalls</h3>
            <p>Cars, trucks, motorcycles</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
