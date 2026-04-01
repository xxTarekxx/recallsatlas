import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

const langMap: Record<string, string> = {
  en: "English",
  zh: "Chinese Simplified",
  es: "Spanish",
  ar: "Arabic",
  hi: "Hindi",
  pt: "Portuguese (Brazil)",
  ru: "Russian",
  fr: "French",
  ja: "Japanese",
  de: "German",
  vi: "Vietnamese",
};

export async function translateRecall({
  summary,
  remedy,
  consequence,
  lang,
}: {
  summary: string;
  remedy: string;
  consequence: string;
  lang: string;
}) {
  const s = String(summary ?? "").trim();
  const r = String(remedy ?? "").trim();
  const c = String(consequence ?? "").trim();
  if (!s && !r) {
    throw new Error("Missing summary and remedy");
  }

  const languageName = langMap[lang];

  if (!languageName) {
    throw new Error(`Unsupported language: ${lang}`);
  }

  if (lang === "en") {
    return { summary: s, remedy: r, consequence: c };
  }

  const summaryForModel = s || "(No summary provided.)";
  const remedyForModel = r || "(No remedy provided.)";
  const consequenceForModel = c || "(No consequence provided.)";

  const systemPrompt = `
You are a professional automotive safety translator.

Your task:
- Translate vehicle recall information accurately into ${languageName}.
- Maintain the exact meaning, severity, and safety context.
- Preserve all critical safety warnings (fire risk, injury, crash, death).
- Keep the tone clear, natural, and human-readable.
- Make the text SEO-friendly but NOT promotional.

STRICT RULES:
- Do NOT add new information
- Do NOT remove or soften safety warnings
- Do NOT change numbers, dates, or technical facts
- Do NOT hallucinate or guess missing data
- Keep technical accuracy
- Keep important keywords translated correctly and consistently

STYLE:
- Use simple, clear language
- Keep sentences concise
- Maintain professional tone
- Avoid overly formal or robotic phrasing

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "summary": "...",
  "remedy": "...",
  "consequence": "..."
}
If the English consequence is empty or marked as none, set "consequence" to an empty string.
`;

  const userPrompt = `
Translate the following vehicle recall:

Summary:
${summaryForModel}

Remedy:
${remedyForModel}

Consequence:
${consequenceForModel}
`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  let parsed: any;

  try {
    parsed = JSON.parse(response.choices[0].message.content || "{}");
  } catch {
    throw new Error("Failed to parse OpenAI response");
  }

  if (!parsed.summary || !parsed.remedy) {
    throw new Error("Invalid OpenAI response format");
  }

  const outConsequence =
    typeof parsed.consequence === "string" ? parsed.consequence : "";

  return {
    summary: parsed.summary,
    remedy: parsed.remedy,
    consequence: outConsequence,
  };
}

