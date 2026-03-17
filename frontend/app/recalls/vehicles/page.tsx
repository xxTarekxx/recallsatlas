import Link from "next/link";

export default function VehiclesRecallsPage() {
  return (
    <div className="recalls-page">
      <header className="site-header">
        <Link href="/" className="site-title">
          RecallsAtlas
        </Link>
      </header>
      <main className="main-content">
        <h1>Vehicle Recalls</h1>
        <p className="placeholder-note">
          Vehicle recall data (NHTSA) is coming soon.{" "}
          <Link href="/">Back to home</Link> or{" "}
          <Link href="/recalls">browse FDA recalls</Link>.
        </p>
      </main>
    </div>
  );
}
