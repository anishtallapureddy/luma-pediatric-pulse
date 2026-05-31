import { format } from "date-fns";
import type {
  ProviderHealthWatchData,
  ProviderSummary,
} from "../src/types/health-watch";

function staleNote(d: ProviderHealthWatchData): string {
  const stales: string[] = [];
  if (d.airQuality.stale) stales.push("air quality");
  if (d.pollen.stale) stales.push("pollen");
  if (d.respiratoryIllness.stale) stales.push("respiratory illness");
  if (d.drugShortages.stale) stales.push("drug shortages");
  if (d.vaccinePreventable?.stale) stales.push("vaccine-preventable diseases");
  if (d.communityVirusWatch?.stale) stales.push("community virus watch");
  if (stales.length === 0) return "";
  return `Note: ${stales.join(", ")} did not refresh today; showing previous values.`;
}

export function renderTextEmail(
  data: ProviderHealthWatchData,
  summary: ProviderSummary,
): string {
  const lines: string[] = [];
  lines.push(`Luma Pediatric Pulse — ${summary.riskLevel} readiness today`);
  lines.push(format(new Date(data.lastRefreshedAt ?? data.lastUpdated), "PPPP"));
  lines.push("");
  lines.push(summary.headline);
  lines.push("");
  lines.push(summary.summary);
  lines.push("");

  if (summary.keySignals.length) {
    lines.push("Key signals:");
    for (const s of summary.keySignals) lines.push(`  - ${s}`);
    lines.push("");
  }

  if (summary.recommendedActions.length) {
    lines.push("Recommended operational actions:");
    for (const a of summary.recommendedActions) lines.push(`  - ${a}`);
    lines.push("");
  }

  lines.push(`AQI: ${data.airQuality.currentAqi} (${data.airQuality.category}) — ${data.airQuality.primaryPollutant}`);
  lines.push(`Pollen: tree ${data.pollen.treeLevel}, grass ${data.pollen.grassLevel}, weed ${data.pollen.weedLevel}`);
  lines.push(`Respiratory: RSV ${data.respiratoryIllness.rsvLevel} (${data.respiratoryIllness.rsvTrend}), Flu ${data.respiratoryIllness.fluLevel} (${data.respiratoryIllness.fluTrend}), COVID ${data.respiratoryIllness.covidLevel} (${data.respiratoryIllness.covidTrend})`);

  const virusEntries = data.communityVirusWatch?.entries ?? [];
  const virusActive = virusEntries.filter(
    (v) =>
      v.level === "High" ||
      v.level === "Very High" ||
      (v.trend === "Rising" && v.level !== "Low"),
  );
  if (virusActive.length) {
    lines.push("");
    lines.push("Community virus watch (elevated or rising):");
    for (const v of virusActive) {
      const pct = typeof v.positivityPct === "number" ? `, ${v.positivityPct.toFixed(1)}% positivity` : "";
      lines.push(`  - ${v.name}: ${v.level} / ${v.trend}${pct}`);
    }
  }

  const constrained = data.drugShortages.items.filter(
    (d) => d.status === "Shortage" || d.status === "Limited",
  );
  if (constrained.length) {
    lines.push("");
    lines.push("Constrained meds (check pharmacy):");
    for (const d of constrained) lines.push(`  - ${d.drugName}: ${d.status}`);
  }

  const vpdActive = (data.vaccinePreventable?.items ?? []).filter(
    (v) => v.status === "Active outbreak" || v.status === "Outbreak watch",
  );
  if (vpdActive.length) {
    lines.push("");
    lines.push("Vaccine-preventable disease watch:");
    for (const v of vpdActive)
      lines.push(`  - ${v.diseaseName}: ${v.status} (${v.recentCases} recent cases, ${v.trend})`);
  }

  const stale = staleNote(data);
  if (stale) {
    lines.push("");
    lines.push(stale);
  }

  lines.push("");
  lines.push("Dashboard: see Luma Pediatric Pulse.");
  lines.push(
    "Internal operational dashboard for Luma Pediatrics. Awareness and planning only — not a diagnosis tool.",
  );

  return lines.join("\n");
}

export function renderHtmlEmail(
  data: ProviderHealthWatchData,
  summary: ProviderSummary,
  dashboardUrl: string,
): string {
  const riskColor =
    summary.riskLevel === "High"
      ? "#b91c1c"
      : summary.riskLevel === "Moderate"
        ? "#b45309"
        : "#047857";

  const constrained = data.drugShortages.items.filter(
    (d) => d.status === "Shortage" || d.status === "Limited",
  );

  const stale = staleNote(data);
  const dateStr = format(
    new Date(data.lastRefreshedAt ?? data.lastUpdated),
    "PPPP",
  );

  const signalsHtml = summary.keySignals.length
    ? `<ul style="margin:8px 0 0 20px;padding:0;color:#0B1D3A;">${summary.keySignals
        .map((s) => `<li style="margin:4px 0;">${escapeHtml(s)}</li>`)
        .join("")}</ul>`
    : "";

  const actionsHtml = summary.recommendedActions.length
    ? `<ul style="margin:8px 0 0 20px;padding:0;color:#0B1D3A;">${summary.recommendedActions
        .map((a) => `<li style="margin:4px 0;">${escapeHtml(a)}</li>`)
        .join("")}</ul>`
    : "";

  const virusEntries = data.communityVirusWatch?.entries ?? [];
  const virusActive = virusEntries.filter(
    (v) =>
      v.level === "High" ||
      v.level === "Very High" ||
      (v.trend === "Rising" && v.level !== "Low"),
  );
  const virusHtml = virusActive.length
    ? `<tr><td style="padding:12px 0;"><strong>Community virus watch (elevated or rising):</strong>
        <ul style="margin:8px 0 0 20px;padding:0;color:#0B1D3A;">${virusActive
          .map((v) => {
            const pct = typeof v.positivityPct === "number" ? ` · ${v.positivityPct.toFixed(1)}% positivity` : "";
            return `<li style="margin:4px 0;"><strong>${escapeHtml(v.name)}</strong>: ${escapeHtml(v.level)} / ${escapeHtml(v.trend)}${pct}</li>`;
          })
          .join("")}</ul></td></tr>`
    : "";

  const constrainedHtml = constrained.length
    ? `<tr><td style="padding:12px 0;"><strong>Constrained meds (check pharmacy):</strong>
        <ul style="margin:8px 0 0 20px;padding:0;color:#0B1D3A;">${constrained
          .map((d) => `<li style="margin:4px 0;"><strong>${escapeHtml(d.drugName)}</strong>: ${escapeHtml(d.status)}</li>`)
          .join("")}</ul></td></tr>`
    : "";

  const staleHtml = stale
    ? `<tr><td style="padding:12px 16px;background:#F0E5D2;border-left:4px solid #C8995A;color:#7a5a25;font-size:13px;">${escapeHtml(stale)}</td></tr>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#F7EFE4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0B1D3A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7EFE4;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF3;border-radius:16px;border:1px solid #E6D9C2;overflow:hidden;">
        <tr><td style="padding:24px 24px 8px 24px;">
          <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${riskColor}1a;color:${riskColor};font-weight:600;font-size:12px;border:1px solid ${riskColor}40;">${summary.riskLevel} readiness</div>
          <h1 style="margin:12px 0 4px 0;font-size:20px;">Luma Pediatric Pulse</h1>
          <div style="color:#5B6877;font-size:13px;">${dateStr}</div>
        </td></tr>
        <tr><td style="padding:8px 24px 0 24px;">
          <h2 style="margin:8px 0 4px 0;font-size:17px;color:#0B1D3A;">${escapeHtml(summary.headline)}</h2>
          <p style="margin:8px 0;line-height:1.5;color:#0B1D3A;">${escapeHtml(summary.summary)}</p>
        </td></tr>
        ${summary.keySignals.length ? `<tr><td style="padding:8px 24px;"><strong>Key signals</strong>${signalsHtml}</td></tr>` : ""}
        ${summary.recommendedActions.length ? `<tr><td style="padding:8px 24px;"><strong>Recommended actions</strong>${actionsHtml}</td></tr>` : ""}
        <tr><td style="padding:16px 24px;background:#F7EFE4;border-top:1px solid #E6D9C2;color:#5B6877;font-size:13px;">
          <div><strong>AQI:</strong> ${data.airQuality.currentAqi} (${escapeHtml(data.airQuality.category)}) — ${escapeHtml(data.airQuality.primaryPollutant)}</div>
          <div style="margin-top:4px;"><strong>Pollen:</strong> tree ${escapeHtml(data.pollen.treeLevel)}, grass ${escapeHtml(data.pollen.grassLevel)}, weed ${escapeHtml(data.pollen.weedLevel)}</div>
          <div style="margin-top:4px;"><strong>Respiratory:</strong> RSV ${escapeHtml(data.respiratoryIllness.rsvLevel)} (${escapeHtml(data.respiratoryIllness.rsvTrend)}), Flu ${escapeHtml(data.respiratoryIllness.fluLevel)} (${escapeHtml(data.respiratoryIllness.fluTrend)}), COVID ${escapeHtml(data.respiratoryIllness.covidLevel)} (${escapeHtml(data.respiratoryIllness.covidTrend)})</div>
        </td></tr>
        ${virusHtml ? `<tr><td style="padding:0 24px;">${virusHtml}</td></tr>` : ""}
        ${constrainedHtml ? `<tr><td style="padding:0 24px;">${constrainedHtml}</td></tr>` : ""}
        ${staleHtml}
        <tr><td style="padding:20px 24px;text-align:center;">
          <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:10px 16px;background:#0B1D3A;color:#FDFAF3;border-radius:8px;text-decoration:none;font-weight:600;">Open dashboard</a>
        </td></tr>
        <tr><td style="padding:12px 24px 20px 24px;color:#5B6877;font-size:11px;line-height:1.5;">
          Internal operational dashboard for Luma Pediatrics. Public health data used for awareness and planning only. Clinical decisions should be based on provider judgment and patient-specific evaluation. Not a diagnosis tool.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
