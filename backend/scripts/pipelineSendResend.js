/**
 * Send one plain-text email via Resend (used by recallFlow.sh).
 * Same env as recallFlow.ps1: RESEND_API_KEY, ALERT_EMAIL, optional RESEND_FROM.
 *
 *   node scripts/pipelineSendResend.js --subject "..." --body-file /path/to.txt
 *
 * Exits 0 if disabled, on API errors, or on success (never fails the pipeline).
 */
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const backendRoot = path.join(__dirname, "..");

require("dotenv").config({ path: path.join(backendRoot, "scripts", ".env") });
require("dotenv").config({ path: path.join(backendRoot, ".env"), override: true });

function parseArgs() {
  const a = process.argv.slice(2);
  const out = { subject: null, bodyFile: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--subject" && a[i + 1]) out.subject = a[++i];
    else if (a[i] === "--body-file" && a[i + 1]) out.bodyFile = a[++i];
  }
  return out;
}

async function main() {
  const { subject, bodyFile } = parseArgs();
  if (!process.env.RESEND_API_KEY) return;
  if (!subject || !bodyFile) {
    console.warn("pipelineSendResend: missing --subject or --body-file");
    return;
  }

  const toRaw = process.env.ALERT_EMAIL;
  if (!toRaw || !String(toRaw).trim()) {
    console.warn("RESEND_API_KEY is set but ALERT_EMAIL is missing — skipping email send.");
    return;
  }

  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0) {
    console.warn("ALERT_EMAIL has no valid addresses — skipping.");
    return;
  }

  let body = fs.readFileSync(bodyFile, "utf8");
  const max = 95000;
  if (body.length > max) {
    const tail = "\n\n[... truncated, showing last " + max + " characters ...]\n\n";
    body = tail + body.slice(body.length - max);
  }

  const from =
    process.env.RESEND_FROM && String(process.env.RESEND_FROM).trim()
      ? process.env.RESEND_FROM.trim()
      : "RecallsAtlas <onboarding@resend.dev>";

  try {
    const res = await axios.post(
      "https://api.resend.com/emails",
      { from, to, subject, text: body },
      {
        headers: {
          Authorization: "Bearer " + process.env.RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      }
    );
    if (res.status < 200 || res.status >= 300) {
      console.warn("Resend API error:", res.status, res.data != null ? String(res.data) : "");
    }
  } catch (e) {
    console.warn("Resend request failed:", e.message);
  }
}

main().catch((e) => console.warn(e));
