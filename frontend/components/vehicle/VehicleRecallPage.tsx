import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecallFromDB } from "@/lib/cars/carDb";

const SUPPORTED_LANGS = ["en", "zh", "es", "ar", "hi", "pt", "ru", "fr", "ja", "de", "vi"] as const;
const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

type Props = {
  campaignNumber: string;
  lang?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function VehicleRecallPage({ campaignNumber, lang = "en" }: Props) {
  const normalizedCampaign = String(campaignNumber || "").trim();
  if (!normalizedCampaign) notFound();
  if (!SUPPORTED_LANG_SET.has(lang)) notFound();

  const recall: any = await getRecallFromDB(normalizedCampaign);
  if (!recall) notFound();

  const languages = recall?.languages && typeof recall.languages === "object" ? recall.languages : {};
  const base = languages?.en || {};
  const hasTranslation = lang !== "en" && Boolean(languages?.[lang]);
  const active = hasTranslation ? languages?.[lang] || {} : base;

  // English baseline always comes from languages.en, never raw source fields.
  const summary = clean(active.summary) || clean(base.summary);
  const remedy = clean(active.remedy) || clean(base.remedy);
  const component = clean(recall?.component);
  const reportDate = clean(recall?.reportDate);

  return (
    <main className="container py-5" style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px 56px" }}>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <Link href={`/recalls/vehicle/${normalizedCampaign}`}>en</Link>
        {SUPPORTED_LANGS.filter((code) => code !== "en").map((code) => (
          <Link key={code} href={`/${code}/recalls/vehicle/${normalizedCampaign}`}>
            {code}
          </Link>
        ))}
      </nav>

      <h1 style={{ margin: "0 0 14px" }}>Vehicle Recall {normalizedCampaign}</h1>
      {!hasTranslation && lang !== "en" ? (
        <p style={{ marginTop: 0, color: "#475569" }}>Showing English version</p>
      ) : null}

      <section style={{ display: "grid", gap: 10 }}>
        <p style={{ margin: 0 }}>
          <strong>Summary:</strong> {summary || "N/A"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Remedy:</strong> {remedy || "N/A"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Component:</strong> {component || "N/A"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Report Date:</strong> {reportDate || "N/A"}
        </p>
      </section>
    </main>
  );
}
