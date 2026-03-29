import Link from "next/link";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";

export default function VehiclesRecallsPage() {
  return (
    <div className="recalls-page">
      <header className="site-header">
        <SiteBrandLogoLink />
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
