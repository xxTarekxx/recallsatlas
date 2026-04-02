import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

export default function BrandIndexPage({ uiLang }: { uiLang: SiteUiLang }) {
  const homeHref = withLangPath("/", uiLang);
  return (
    <div className="brand-index-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
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
