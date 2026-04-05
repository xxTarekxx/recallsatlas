/**
 * For each category CSV like accessories_2023-12-01_2026-04-01.csv, writes
 *   generalRecallsJson/<slug>.json  (e.g. generalRecallsJson/accessories.json)
 * Merges testing2.json (CPSC API shape) with CSV rows by Recall Number.
 * JSON wins when present; CSV fills gaps. Each recall is one pruned object (no separate csv/cpscApi).
 *
 * Run from backend/:
 *   npm run merge-general-recalls
 *   node scripts/rewritingWithOpenAi/mergeDownloadsToJson.js
 *
 * Requires: backend/node_modules (npm install), testing2.json + CSVs in scripts/generalRecalls/downloads/
 */
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT = __dirname;
const GR_ROOT = path.join(ROOT, "..", "generalRecalls");
const DOWNLOADS = path.join(GR_ROOT, "downloads");
const JSON_DIR = path.join(GR_ROOT, "generalRecallsJson");
const TESTING2 = path.join(DOWNLOADS, "testing2.json");

/** files named <slug>_YYYY-MM-DD_YYYY-MM-DD.csv */
const CSV_NAME_RE = /^(.+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$/i;

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === "string") return !String(v).trim();
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function pick(primary, fallback) {
  return !isEmpty(primary) ? primary : fallback;
}

function normKey(n) {
  return String(n == null ? "" : n).trim();
}

/** Remove null, undefined, "", whitespace-only strings, empty arrays, empty objects (recursive). Keeps 0 and false. */
function pruneEmptyDeep(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const p = pruneEmptyDeep(item);
      if (p !== undefined) out.push(p);
    }
    return out.length === 0 ? undefined : out;
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const p = pruneEmptyDeep(v);
      if (p !== undefined) out[k] = p;
    }
    return Object.keys(out).length === 0 ? undefined : out;
  }
  return value;
}

/** Best-effort: keep CSV date text if parsing fails */
function csvDateToIso(display) {
  const s = String(display || "").trim();
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString();
  return s;
}

function indexByRecallNumber(recalls) {
  const map = new Map();
  for (const r of recalls) {
    const k = normKey(r.RecallNumber);
    if (k) map.set(k, r);
  }
  return map;
}

function mergeFromCsvIntoApi(csv, api) {
  const out = JSON.parse(JSON.stringify(api));

  out.Title = pick(out.Title, csv["Recall Heading"]);
  out.Description = pick(out.Description, csv["Description"]);
  out.ConsumerContact = pick(out.ConsumerContact, csv["Consumer Action"]);

  const orig = csv["Original Product Safety Warning Announcement"];
  const origStr = orig != null ? String(orig).trim() : "";
  if (isEmpty(out.URL) && /^https?:\/\//i.test(origStr)) out.URL = origStr;

  if (isEmpty(out.RecallDate) && csv.Date) {
    out.RecallDate = csvDateToIso(csv.Date) || csv.Date;
  }

  if (isEmpty(out.Products)) {
    const name = csv["Name of product"];
    if (!isEmpty(name)) {
      out.Products = [
        {
          Name: name,
          Description: "",
          Model: "",
          Type: "",
          CategoryID: "",
          NumberOfUnits: csv.Units != null ? String(csv.Units) : "",
        },
      ];
    }
  } else {
    out.Products = out.Products.map((p, idx) => {
      if (idx === 0 && isEmpty(p.Name)) {
        return { ...p, Name: pick(p.Name, csv["Name of product"]) };
      }
      return p;
    });
  }

  if (isEmpty(out.Hazards)) {
    const h = csv["Hazard Description"];
    if (!isEmpty(h)) out.Hazards = [{ Name: h, HazardType: "", HazardTypeID: "" }];
  }

  if (isEmpty(out.Remedies)) {
    const r = csv["Remedy"];
    if (!isEmpty(r)) out.Remedies = [{ Name: r }];
  }

  if (isEmpty(out.RemedyOptions)) {
    const rt = csv["Remedy Type"];
    if (!isEmpty(rt)) out.RemedyOptions = [{ Option: rt }];
  }

  if (isEmpty(out.Injuries)) {
    const inc = csv["Incidents"];
    if (!isEmpty(inc)) out.Injuries = [{ Name: inc }];
  }

  if (isEmpty(out.Manufacturers)) {
    const m = csv["Manufacturers"];
    if (!isEmpty(m)) out.Manufacturers = [{ Name: m, CompanyID: "" }];
  }

  if (isEmpty(out.Importers)) {
    const m = csv["Importers"];
    if (!isEmpty(m)) out.Importers = [{ Name: m, CompanyID: "" }];
  }

  if (isEmpty(out.Distributors)) {
    const m = csv["Distributors"];
    if (!isEmpty(m)) out.Distributors = [{ Name: m, CompanyID: "" }];
  }

  if (isEmpty(out.Retailers)) {
    const sold = csv["Sold At"];
    if (!isEmpty(sold)) out.Retailers = [{ Name: sold, CompanyID: "" }];
  }

  if (isEmpty(out.ManufacturerCountries)) {
    const c = csv["Manufactured In"];
    if (!isEmpty(c)) out.ManufacturerCountries = [{ Country: c }];
  }

  out.SoldAtLabel = pick(out.SoldAtLabel, csv["Sold At Label"]);
  if (out.SoldAtLabel === "") delete out.SoldAtLabel;

  return out;
}

/** CSV-only: build same general shape as API for consistency */
function mergedFromCsvOnly(csv) {
  const num = normKey(csv["Recall Number"]);
  const merged = {
    RecallID: null,
    RecallNumber: num,
    RecallDate: csvDateToIso(csv.Date) || csv.Date || null,
    Description: csv["Description"] || "",
    URL: "",
    Title: csv["Recall Heading"] || "",
    ConsumerContact: csv["Consumer Action"] || "",
    LastPublishDate: null,
    Products: [],
    Inconjunctions: [],
    Images: [],
    Injuries: [],
    Manufacturers: [],
    Retailers: [],
    Importers: [],
    Distributors: [],
    SoldAtLabel: csv["Sold At Label"],
    ManufacturerCountries: [],
    ProductUPCs: [],
    Hazards: [],
    Remedies: [],
    RemedyOptions: [],
  };

  const orig = csv["Original Product Safety Warning Announcement"];
  const origStr = orig != null ? String(orig).trim() : "";
  if (/^https?:\/\//i.test(origStr)) merged.URL = origStr;

  const name = csv["Name of product"];
  if (!isEmpty(name)) {
    merged.Products = [
      {
        Name: name,
        Description: "",
        Model: "",
        Type: "",
        CategoryID: "",
        NumberOfUnits: csv.Units != null ? String(csv.Units) : "",
      },
    ];
  }

  if (!isEmpty(csv["Hazard Description"])) {
    merged.Hazards = [{ Name: csv["Hazard Description"], HazardType: "", HazardTypeID: "" }];
  }
  if (!isEmpty(csv["Remedy"])) merged.Remedies = [{ Name: csv["Remedy"] }];
  if (!isEmpty(csv["Remedy Type"])) merged.RemedyOptions = [{ Option: csv["Remedy Type"] }];
  if (!isEmpty(csv["Incidents"])) merged.Injuries = [{ Name: csv["Incidents"] }];
  if (!isEmpty(csv["Manufacturers"])) merged.Manufacturers = [{ Name: csv["Manufacturers"], CompanyID: "" }];
  if (!isEmpty(csv["Importers"])) merged.Importers = [{ Name: csv["Importers"], CompanyID: "" }];
  if (!isEmpty(csv["Distributors"])) merged.Distributors = [{ Name: csv["Distributors"], CompanyID: "" }];
  if (!isEmpty(csv["Sold At"])) merged.Retailers = [{ Name: csv["Sold At"], CompanyID: "" }];
  if (!isEmpty(csv["Manufactured In"])) merged.ManufacturerCountries = [{ Country: csv["Manufactured In"] }];

  return merged;
}

/** Prefer API values when non-empty; otherwise use merged-from-csv pass (already fills gaps from csv into api clone). */
function fillApiGapsFromCsv(mergedApi, csv) {
  const m = { ...mergedApi };
  m.Title = pick(m.Title, csv["Recall Heading"]);
  m.Description = pick(m.Description, csv["Description"]);
  m.ConsumerContact = pick(m.ConsumerContact, csv["Consumer Action"]);
  const orig = csv["Original Product Safety Warning Announcement"];
  const origStr = orig != null ? String(orig).trim() : "";
  if (isEmpty(m.URL) && /^https?:\/\//i.test(origStr)) m.URL = origStr;
  if (isEmpty(m.RecallDate) && csv.Date) m.RecallDate = csvDateToIso(csv.Date) || csv.Date;
  m.SoldAtLabel = pick(m.SoldAtLabel, csv["Sold At Label"]);
  if (m.SoldAtLabel === "") delete m.SoldAtLabel;

  if (isEmpty(m.Products) && !isEmpty(csv["Name of product"])) {
    m.Products = [
      {
        Name: csv["Name of product"],
        Description: "",
        Model: "",
        Type: "",
        CategoryID: "",
        NumberOfUnits: csv.Units != null ? String(csv.Units) : "",
      },
    ];
  }

  if (isEmpty(m.Hazards) && !isEmpty(csv["Hazard Description"])) {
    m.Hazards = [{ Name: csv["Hazard Description"], HazardType: "", HazardTypeID: "" }];
  }
  if (isEmpty(m.Remedies) && !isEmpty(csv["Remedy"])) m.Remedies = [{ Name: csv["Remedy"] }];
  if (isEmpty(m.RemedyOptions) && !isEmpty(csv["Remedy Type"])) m.RemedyOptions = [{ Option: csv["Remedy Type"] }];
  if (isEmpty(m.Injuries) && !isEmpty(csv["Incidents"])) m.Injuries = [{ Name: csv["Incidents"] }];
  if (isEmpty(m.Manufacturers) && !isEmpty(csv["Manufacturers"])) {
    m.Manufacturers = [{ Name: csv["Manufacturers"], CompanyID: "" }];
  }
  if (isEmpty(m.Importers) && !isEmpty(csv["Importers"])) m.Importers = [{ Name: csv["Importers"], CompanyID: "" }];
  if (isEmpty(m.Distributors) && !isEmpty(csv["Distributors"])) m.Distributors = [{ Name: csv["Distributors"], CompanyID: "" }];
  if (isEmpty(m.Retailers) && !isEmpty(csv["Sold At"])) m.Retailers = [{ Name: csv["Sold At"], CompanyID: "" }];
  if (isEmpty(m.ManufacturerCountries) && !isEmpty(csv["Manufactured In"])) {
    m.ManufacturerCountries = [{ Country: csv["Manufactured In"] }];
  }

  return m;
}

function processOneCsv(filePath, slug, byNum) {
  const buf = fs.readFileSync(filePath, "utf8");
  const rows = parse(buf, { columns: true, skip_empty_lines: true, relax_quotes: true });
  const recalls = [];

  for (const csv of rows) {
    const num = normKey(csv["Recall Number"]);
    if (!num) continue;

    const api = byNum.get(num) || null;
    let merged;
    if (api) {
      merged = mergeFromCsvIntoApi(csv, api);
      merged = fillApiGapsFromCsv(merged, csv);
    } else {
      merged = mergedFromCsvOnly(csv);
    }

    recalls.push(pruneEmptyDeep(merged));
  }

  return {
    meta: {
      slug,
      sourceCsvFile: path.basename(filePath),
      mergedFromJson: "testing2.json",
      generatedAt: new Date().toISOString(),
      recallCount: recalls.length,
    },
    recalls,
  };
}

function main() {
  if (!fs.existsSync(TESTING2)) {
    console.error("Missing:", TESTING2);
    process.exit(1);
  }

  const raw = fs.readFileSync(TESTING2, "utf8");
  const list = JSON.parse(raw);
  const byNum = indexByRecallNumber(list);

  fs.mkdirSync(JSON_DIR, { recursive: true });

  const names = fs.readdirSync(DOWNLOADS).filter((n) => n.endsWith(".csv"));
  /** One CSV per slug: if several date ranges exist, keep lexicographically greatest filename (usually newest export). */
  const slugToFile = new Map();
  for (const name of names) {
    const m = name.match(CSV_NAME_RE);
    if (!m) continue;
    const slug = m[1];
    const prev = slugToFile.get(slug);
    if (!prev || name > prev) slugToFile.set(slug, name);
  }

  let written = 0;
  for (const [slug, name] of [...slugToFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const full = path.join(DOWNLOADS, name);
    const doc = processOneCsv(full, slug, byNum);
    const outPath = path.join(JSON_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2), "utf8");
    written++;
    console.log(outPath, `(${doc.meta.recallCount} recalls) <- ${name}`);
  }

  console.log(`Done. ${written} files -> ${JSON_DIR}`);
}

main();
