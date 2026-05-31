import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resend } from "resend";
import type { ProviderHealthWatchData } from "../src/types/health-watch";
import { generateProviderSummary } from "../src/lib/health-watch/generateProviderSummary";
import { renderHtmlEmail, renderTextEmail } from "./render-email";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const toRaw = process.env.STAFF_EMAILS;
  const from = process.env.EMAIL_FROM ?? "Luma Pediatric Pulse <pulse@lumapediatrics.com>";
  const dashboardUrl =
    process.env.DASHBOARD_URL ?? "https://pulse.lumapediatrics.com/";

  if (!apiKey) {
    console.error("RESEND_API_KEY is required.");
    process.exit(1);
  }
  if (!toRaw) {
    console.error("STAFF_EMAILS is required (comma-separated).");
    process.exit(1);
  }

  const to = toRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (to.length === 0) {
    console.error("STAFF_EMAILS parsed to empty list.");
    process.exit(1);
  }

  const snapshotPath = resolve("data/snapshot.json");
  const data = JSON.parse(readFileSync(snapshotPath, "utf8")) as ProviderHealthWatchData;
  const summary = generateProviderSummary(data);

  const html = renderHtmlEmail(data, summary, dashboardUrl);
  const text = renderTextEmail(data, summary);

  const resend = new Resend(apiKey);

  const { data: sendResult, error } = await resend.emails.send({
    from,
    to,
    subject: summary.emailSubject,
    html,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    process.exit(1);
  }
  console.log("Email sent:", sendResult?.id);
}

main().catch((err) => {
  console.error("Fatal email error:", err);
  process.exit(1);
});
