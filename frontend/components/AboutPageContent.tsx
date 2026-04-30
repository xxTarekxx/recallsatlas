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

          {"sections" in c && Array.isArray(c.sections)
            ? c.sections.map((section, i) => (
                <section key={i} className="about-section">
                  {section.heading && (
                    <h2 className="about-section-heading">{section.heading}</h2>
                  )}
                  {section.paragraphs.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </section>
              ))
            : c.paragraphs.map((p, i) => (
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
