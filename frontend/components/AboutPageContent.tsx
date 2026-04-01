import Link from "next/link";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { ABOUT_COPY } from "@/lib/aboutCopy";
import type { SiteUiLang } from "@/lib/siteLocale";
import { withLangPath } from "@/lib/siteLocale";

export default function AboutPageContent({ lang }: { lang: SiteUiLang }) {
  const c = ABOUT_COPY[lang];

  return (
    <div className="policy-page">
      <header className="site-header">
        <SiteBrandLogoLink href={withLangPath("/", lang)} />
      </header>

      <main className="main-content policy-main">
        <article className="policy-article">
          <h1 className="policy-heading">{c.title}</h1>
          {c.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p>
            <Link href={withLangPath("/privacy", lang)}>{c.privacyLabel}</Link>
          </p>
        </article>
      </main>
    </div>
  );
}
