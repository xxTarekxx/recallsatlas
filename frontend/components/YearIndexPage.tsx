import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

export default function YearIndexPage({ uiLang }: { uiLang: SiteUiLang }) {
  const homeHref = withLangPath("/", uiLang);
  return (
    <div className="year-index-page">
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
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
