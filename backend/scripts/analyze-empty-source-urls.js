/**
 * One-off: for recalls with empty sourceUrl + source_url, show other FDA/HTTP fields.
 * Run: node scripts/analyze-empty-source-urls.js
 * Table (sortOrder, title, slug, FDA URL from languages.en): add --table
 */
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "recalls.json");
const FDA = /fda\.gov/i;

function collectStrings(obj, out, prefix = "") {
  if (obj == null) return;
  if (typeof obj === "string") {
    if (FDA.test(obj) || /^https?:\/\//i.test(obj)) {
      out.push({ path: prefix || "(root)", val: obj });
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => collectStrings(v, out, `${prefix}[${i}]`));
    return;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (k === "languages") continue;
      const p = prefix ? `${prefix}.${k}` : k;
      collectStrings(obj[k], out, p);
    }
  }
}

/** TSV for FDA table search: sortOrder, title, slug, date hint, FDA URL from languages.en */
function firstFdaHref(r) {
  const en = r.languages && r.languages.en;
  if (!en || !Array.isArray(en.content)) return "";
  for (const sec of en.content) {
    if (!Array.isArray(sec.authorityLinks)) continue;
    for (const h of sec.authorityLinks) {
      const s = String(h);
      const m = s.match(/href=['"]([^'"]+fda\.gov[^'"]*)['"]/i);
      if (m) return m[1];
    }
  }
  return "";
}

const recalls = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const empty = recalls.filter((r) => {
  const su = (r.sourceUrl && String(r.sourceUrl).trim()) || "";
  const s_ = (r.source_url && String(r.source_url).trim()) || "";
  return !su && !s_;
});

if (process.argv.includes("--table")) {
  empty.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  console.log("sortOrder\ttitle\tslug\tdateHint\tfdaGovFromEn");
  for (const r of empty) {
    const en = r.languages && r.languages.en;
    const dateHint =
      (en && (en.report_date || en.datePublished || en.fdaPublishDate)) || "";
    const row = [
      r.sortOrder,
      (r.title || "").replace(/\t/g, " "),
      r.slug || "",
      String(dateHint).replace(/\t/g, " "),
      firstFdaHref(r).replace(/\t/g, " "),
    ];
    console.log(row.join("\t"));
  }
  process.exit(0);
}

console.log("Records with both sourceUrl and source_url empty:", empty.length);

for (const r of empty) {
  console.log("\n===", r.slug, "===");
  const keys = [
    "canonicalUrl",
    "consumerWebsite",
    "companyWebsite",
    "sourceUrl",
    "source_url",
  ];
  for (const k of keys) {
    if (r[k]) console.log(`${k}:`, String(r[k]).slice(0, 160));
  }

  const hits = [];
  collectStrings(r, hits);
  const fdaHits = hits.filter((h) => FDA.test(h.val));
  console.log("fda.gov mentions in object (excluding languages):", fdaHits.length);
  fdaHits.slice(0, 12).forEach((h) => console.log(" ", h.path, "->", h.val.slice(0, 140)));

  if (Array.isArray(r.content)) {
    let n = 0;
    for (const sec of r.content) {
      if (Array.isArray(sec.authorityLinks)) n += sec.authorityLinks.length;
    }
    console.log("authorityLinks total:", n);
  }
}
