/**
 * FDA recall `content[]` is parallel across `languages.*.content` (same order as English).
 * Use English subtitles to find indices, then read the active language's section at that index.
 */

function normSub(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim();
}

/** When English index missing or array length mismatch, match localized "Official source" headings. */
const OFFICIAL_SUBTITLE_MARKERS = [
  "official source",
  "source officielle",
  "fuente oficial",
  "offizielle quelle",
  "fonte ufficiale",
  "fonte oficial",
  "официальный источник",
  "公式情報源",
  "officiële bron",
  "oficjalne źródło",
  "resmi kaynak",
  "منبع رسمی",
  "官方来源",
  "nguồn chính thức",
  "sumber resmi",
  "oficiální zdroj",
  "공식 출처",
  "офіційне джерело",
  "hivatalos forrás",
  "आधिकारिक स्रोत",
  "المصدر الرسمي",
] as const;

function subtitleLooksOfficial(sub: string): boolean {
  const t = normSub(sub);
  if (t.includes("official source")) return true;
  for (const m of OFFICIAL_SUBTITLE_MARKERS) {
    if (m === "आधिकारिक स्रोत" || m === "المصدر الرسمي" || m === "官方来源" || m === "منبع رسمی") {
      if (sub.includes(m)) return true;
    } else if (t.includes(m.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function indexInEn(enContent: any[], pred: (s: any) => boolean): number {
  if (!Array.isArray(enContent)) return -1;
  return enContent.findIndex(pred);
}

function contentArraysAligned(rawContent: any[], enContent: any[]): boolean {
  return (
    Array.isArray(rawContent) &&
    Array.isArray(enContent) &&
    enContent.length > 0 &&
    enContent.length === rawContent.length
  );
}

export function getEnglishContentRef(translatedByCode: Record<string, any>, recall: any): any[] {
  const en = translatedByCode?.en;
  if (Array.isArray(en?.content)) return en.content;
  if (Array.isArray(recall?.content)) return recall.content;
  return [];
}

export function pickWhatWasRecalledSection(rawContent: any[], enContent: any[]): any | undefined {
  if (contentArraysAligned(rawContent, enContent)) {
    const idx = indexInEn(
      enContent,
      (s) =>
        (s?.facts &&
          typeof s.facts === "object" &&
          Object.keys(s.facts as object).length > 0) ||
        normSub(s?.subtitle).includes("what was recalled")
    );
    if (idx >= 0 && rawContent[idx]) return rawContent[idx];
  }
  return rawContent.find(
    (s) =>
      s?.facts &&
      typeof s.facts === "object" &&
      Object.keys(s.facts as object).length > 0
  );
}

export function pickOfficialSourceSection(rawContent: any[], enContent: any[]): any | undefined {
  if (contentArraysAligned(rawContent, enContent)) {
    const idx = indexInEn(enContent, (s) => normSub(s?.subtitle).includes("official source"));
    if (idx >= 0 && rawContent[idx]) return rawContent[idx];
  }
  return rawContent.find((s) => subtitleLooksOfficial(String(s?.subtitle ?? "")));
}

export function contentSectionExcludeIndices(enContent: any[]): Set<number> {
  const out = new Set<number>();
  const official = indexInEn(enContent, (s) => normSub(s?.subtitle).includes("official source"));
  if (official < 0) {
    const i = enContent.findIndex((s) => subtitleLooksOfficial(String(s?.subtitle ?? "")));
    if (i >= 0) out.add(i);
  } else {
    out.add(official);
  }
  const reason = indexInEn(enContent, (s) => normSub(s?.subtitle).includes("reason for recall"));
  if (reason >= 0) out.add(reason);
  const wwr = indexInEn(
    enContent,
    (s) =>
      (s?.facts &&
        typeof s.facts === "object" &&
        Object.keys(s.facts as object).length > 0) ||
      normSub(s?.subtitle).includes("what was recalled")
  );
  if (wwr >= 0) out.add(wwr);
  return out;
}

/** When EN/active lengths differ, drop side blocks using the active section only. */
export function excludeSectionFromMainFlow(section: any): boolean {
  const sub = normSub(section?.subtitle);
  if (sub.includes("reason for recall")) return true;
  if (subtitleLooksOfficial(String(section?.subtitle ?? ""))) return true;
  if (
    section?.facts &&
    typeof section.facts === "object" &&
    Object.keys(section.facts as object).length > 0
  ) {
    return true;
  }
  if (sub.includes("what was recalled")) return true;
  return false;
}

export function filterMainContentSections(rawContent: any[], enContent: any[]): any[] {
  if (!Array.isArray(rawContent)) return [];
  if (contentArraysAligned(rawContent, enContent)) {
    const ex = contentSectionExcludeIndices(enContent);
    return rawContent.filter((_, i) => !ex.has(i));
  }
  return rawContent.filter((s) => !excludeSectionFromMainFlow(s));
}
