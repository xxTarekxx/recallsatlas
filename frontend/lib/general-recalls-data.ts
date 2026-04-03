import fs from "fs";
import path from "path";

/** Translated CPSC “general” recall (from `generalRecallsTranslated/*.json`). */
export type GeneralRecallImage = {
  URL?: string;
  Caption?: string;
  SourceImageURL?: string;
  ImageFetchFailed?: boolean;
};

export type GeneralRecall = {
  slug?: string;
  seo?: { slug?: string; metaDescription?: string };
  metaDescription?: string;
  RecallNumber?: string;
  RecallDate?: string;
  Title?: string;
  Description?: string;
  URL?: string;
  ConsumerContact?: string;
  Products?: { Name?: string; Model?: string; Type?: string; NumberOfUnits?: string }[];
  Images?: GeneralRecallImage[];
  Hazards?: { Name?: string }[];
  Remedies?: { Name?: string }[];
  Retailers?: { Name?: string }[];
  Injuries?: { Name?: string }[];
  [key: string]: unknown;
};

export type GeneralRecallFileMeta = {
  slug?: string;
  [key: string]: unknown;
};

export type GeneralRecallDoc = {
  meta?: GeneralRecallFileMeta;
  recalls: GeneralRecall[];
};

function translatedDirCandidates(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "backend", "scripts", "generalRecalls", "generalRecallsTranslated"),
    path.join(cwd, "..", "backend", "scripts", "generalRecalls", "generalRecallsTranslated"),
  ];
}

export function getGeneralRecallsTranslatedDir(): string | null {
  for (const p of translatedDirCandidates()) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Stable URL segment: prefer top-level `slug`, then legacy `seo.slug`. */
export function getGeneralRecallSlug(recall: GeneralRecall): string | null {
  const top = recall.slug;
  if (typeof top === "string" && top.trim()) return top.trim();
  const legacy = recall.seo?.slug;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

function listTranslatedJsonFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "imageUrlMap.json")
    .sort();
}

export function loadGeneralRecallBySlug(slug: string): GeneralRecall | null {
  const dir = getGeneralRecallsTranslatedDir();
  if (!dir) return null;
  for (const file of listTranslatedJsonFiles(dir)) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    let doc: GeneralRecallDoc;
    try {
      doc = JSON.parse(raw) as GeneralRecallDoc;
    } catch {
      continue;
    }
    for (const r of doc.recalls || []) {
      if (getGeneralRecallSlug(r) === slug) return r;
    }
  }
  return null;
}

export function getAllGeneralRecallSlugs(): string[] {
  return [...getGeneralRecallSlugDateMap().keys()].sort((a, b) => a.localeCompare(b));
}

/** Slug → lastModified for sitemap (dedupes duplicate slugs across files — latest wins). */
export function getGeneralRecallSlugDateMap(): Map<string, Date> {
  const dir = getGeneralRecallsTranslatedDir();
  const map = new Map<string, Date>();
  if (!dir) return map;
  for (const file of listTranslatedJsonFiles(dir)) {
    let doc: GeneralRecallDoc;
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      doc = JSON.parse(raw) as GeneralRecallDoc;
    } catch {
      continue;
    }
    for (const r of doc.recalls || []) {
      const s = getGeneralRecallSlug(r);
      if (!s) continue;
      const lm = getGeneralRecallLastModified(r);
      const prev = map.get(s);
      if (!prev || lm.getTime() > prev.getTime()) map.set(s, lm);
    }
  }
  return map;
}

export function getGeneralRecallLastModified(recall: GeneralRecall): Date {
  const candidates = [recall.LastPublishDate, recall.RecallDate];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}
