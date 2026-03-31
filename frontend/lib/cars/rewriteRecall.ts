const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

type RewriteInput = {
  summary: string;
  remedy: string;
};

type RewriteOutput = {
  summary_rewritten: string;
  remedy_rewritten: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function rewriteRecall(input: RewriteInput): Promise<RewriteOutput> {
  const summary = clean(input.summary);
  const remedy = clean(input.remedy);

  if (!summary && !remedy) {
    return { summary_rewritten: "", remedy_rewritten: "" };
  }

  if (!OPENAI_API_KEY) {
    return { summary_rewritten: summary, remedy_rewritten: remedy };
  }

  const instructions = [
    "Rewrite vehicle recall text.",
    "Return strict JSON: {\"summary_rewritten\":\"...\",\"remedy_rewritten\":\"...\"}.",
    "Rules:",
    "- Keep exact meaning and facts.",
    "- SEO-friendly and human-readable.",
    "- No fluff and no hallucinations.",
    "- Preserve safety keywords when relevant: fire, injury, crash, recall, vehicle.",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: `${instructions}\n\n${JSON.stringify({ summary, remedy })}`,
    }),
  });

  if (!res.ok) {
    return { summary_rewritten: summary, remedy_rewritten: remedy };
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
    return {
      summary_rewritten: clean(parsed?.summary_rewritten) || summary,
      remedy_rewritten: clean(parsed?.remedy_rewritten) || remedy,
    };
  } catch {
    return { summary_rewritten: summary, remedy_rewritten: remedy };
  }
}

