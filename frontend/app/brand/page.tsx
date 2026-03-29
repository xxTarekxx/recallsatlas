import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";

export default function BrandIndexPage() {
  return (
    <div className="brand-index-page">
      <header className="site-header">
        <SiteBrandLogoLink />
      </header>
      <main className="main-content">
        <h1>Browse by Brand</h1>
        <p className="placeholder-note">
          Brand list will be populated from MongoDB.
        </p>
      </main>
    </div>
  );
}
