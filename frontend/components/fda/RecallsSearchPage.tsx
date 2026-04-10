import { Suspense } from "react";
import RecallsFilterAndGridClient from "@/components/fda/RecallsFilterAndGridClient";
import SiteBrandLogoLink from "@/components/SiteBrandLogoLink";
import { NAV_COPY } from "@/lib/navCopy";
import type { RecallListPage } from "@/lib/recalls-list-data";
import { getRecallsFilterBarUi } from "@/lib/recallsFilterBarUi";
import { isValidCategorySlug } from "@/lib/recallCategoryFilter";
import { isRtlUiLang, withLangPath, type SiteUiLang } from "@/lib/siteLocale";

type Props = {
  lang: SiteUiLang;
  categorySlug?: string;
  initialQuery?: string;
  initialData?: RecallListPage;
};

export default function RecallsSearchPage({
  lang,
  categorySlug,
  initialQuery,
  initialData,
}: Props) {
  const t = NAV_COPY[lang];
  const fb = getRecallsFilterBarUi(lang);
  const normalizedCat = (categorySlug || "").trim().toLowerCase();
  const initialCategory = isValidCategorySlug(normalizedCat) ? normalizedCat : undefined;
  const homeHref = withLangPath("/", lang);
  const pageDir = isRtlUiLang(lang) ? "rtl" : "ltr";

  return (
    <div className="recalls-page" dir={pageDir} lang={lang}>
      <header className="site-header">
        <SiteBrandLogoLink href={homeHref} />
      </header>
      <main className="main-content" style={{ overflow: "visible" }} dir={pageDir} lang={lang}>
        <h1>{t.fda}</h1>
        <Suspense fallback={<p className="placeholder-note">{fb.loadingRecallsList}</p>}>
          <RecallsFilterAndGridClient
            lang={lang}
            initialCategory={initialCategory}
            initialQuery={initialQuery}
            initialData={initialData}
          />
        </Suspense>
      </main>
    </div>
  );
}
