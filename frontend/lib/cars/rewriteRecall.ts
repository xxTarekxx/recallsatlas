import { defaultVehicleRecallSeo } from "@/lib/cars/vehicleRecallSeo";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

type RewriteInput = {
  summary: string;
  remedy: string;
  campaignNumber: string;
  component?: string;
  consequence?: string;
};

export type RewriteOutput = {
  summary_rewritten: string;
  remedy_rewritten: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  canonicalUrl: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function clampLen(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function fallbackOutput(
  summary: string,
  remedy: string,
  campaignNumber: string
): RewriteOutput {
  const seo = defaultVehicleRecallSeo(campaignNumber);
  return {
    summary_rewritten: summary,
    remedy_rewritten: remedy,
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    canonicalPath: seo.canonicalPath,
    canonicalUrl: seo.canonicalUrl,
  };
}

export async function rewriteRecall(input: RewriteInput): Promise<RewriteOutput> {
  const summary = clean(input.summary);
  const remedy = clean(input.remedy);
  const campaignNumber = clean(input.campaignNumber);
  const component = clean(input.component);
  const consequence = clean(input.consequence);

  if (!campaignNumber) {
    return fallbackOutput(summary, remedy, "unknown");
  }

  if (!summary && !remedy) {
    return fallbackOutput("", "", campaignNumber);
  }

  if (!OPENAI_API_KEY) {
    return fallbackOutput(summary, remedy, campaignNumber);
  }

  const context = [
    `campaignNumber: ${campaignNumber}`,
    component ? `component: ${component}` : null,
    consequence ? `consequence (short): ${consequence.slice(0, 400)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const instructions = [
    "Rewrite vehicle recall text and produce SEO metadata for a public recall page.",
    "Return STRICT JSON only (no markdown):",
    '{"summary_rewritten":"...","remedy_rewritten":"...","seo_title":"...","seo_description":"..."}',
    "",
    "Rules for summary_rewritten and remedy_rewritten:",
    "- Keep exact meaning, numbers, dates, and safety facts.",
    "- Clear, human-readable, SEO-friendly wording; no fluff or hallucinations.",
    "- Preserve safety keywords when accurate: fire, injury, crash, recall, vehicle.",
    "",
    "Rules for seo_title:",
    "- 50–60 characters if possible (hard max 70).",
    "- Naturally include the campaign id (e.g. 21V137000) and vehicle safety / recall intent.",
    "- No clickbait; professional tone.",
    "",
    "Rules for seo_description:",
    "- 140–160 characters ideal (hard max 320).",
    "- One or two sentences: risk or scope + that official remedy details are on the page.",
    "- Include the campaign id once if it fits naturally.",
    "",
    "Do NOT output canonical URLs; the site uses a fixed URL pattern per campaign.",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: `${instructions}\n\nContext:\n${context}\n\n${JSON.stringify({ summary, remedy })}`,
    }),
  });

  if (!res.ok) {
    return fallbackOutput(summary, remedy, campaignNumber);
  }

  const payload = await res.json();
  let text =
    payload.output_text ||
    payload.output?.[0]?.content?.[0]?.text ||
    "";
  text = clean(text);

  try {
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    }
    const parsed = JSON.parse(text);
    const base = defaultVehicleRecallSeo(campaignNumber);
    const seoTitle = clampLen(clean(parsed?.seo_title) || base.seoTitle, 70);
    const seoDescription = clampLen(
      clean(parsed?.seo_description) || base.seoDescription,
      320
    );
    return {
      summary_rewritten: clean(parsed?.summary_rewritten) || summary,
      remedy_rewritten: clean(parsed?.remedy_rewritten) || remedy,
      seoTitle: seoTitle || base.seoTitle,
      seoDescription: seoDescription || base.seoDescription,
      canonicalPath: base.canonicalPath,
      canonicalUrl: base.canonicalUrl,
    };
  } catch {
    return fallbackOutput(summary, remedy, campaignNumber);
  }
}
