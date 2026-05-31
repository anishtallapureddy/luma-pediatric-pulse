import type {
  RespiratoryIllness,
  SignalLevel,
  TrendDirection,
} from "../../src/types/health-watch";
import { fetchJson, todayIso } from "./_common";

/**
 * Pulls weekly Texas hospitalization metrics (RSV / flu / COVID) from CDC's
 * open data.cdc.gov dataset and an ED-respiratory surrogate.
 *
 * Primary dataset (no key required, generous rate limits):
 *   https://data.cdc.gov/resource/aemt-mg7g.json
 *   "Weekly United States Hospitalization Metrics by Jurisdiction"
 *
 * Optional: CDC_APP_TOKEN env var avoids unauthenticated rate limit.
 *
 * If the dataset schema changes or the call fails, refresh-snapshot will mark
 * this section as stale and keep the previous values.
 */
interface CdcHospRow {
  jurisdiction?: string;
  week_end_date?: string;
  weekly_actual_days_reporting_any_data?: string;
  totalconfc19newadmped?: string;
  totalconfflunewadmped?: string;
  totalconfrsvnewadmped?: string;
  totalconfc19newadm?: string;
  totalconfflunewadm?: string;
  totalconfrsvnewadm?: string;
}

function pickNum(...vals: (string | undefined)[]): number {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function classifyLevel(value: number, lowMax: number, modMax: number): SignalLevel {
  if (value <= 0) return "Low";
  if (value <= lowMax) return "Low";
  if (value <= modMax) return "Moderate";
  if (value <= modMax * 2) return "High";
  return "Very High";
}

function classifyTrend(series: number[]): TrendDirection {
  if (series.length < 3) return "Stable";
  const recent = series.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const prior =
    series.slice(0, -2).reduce((a, b) => a + b, 0) /
    Math.max(1, series.length - 2);
  if (recent > prior * 1.15) return "Rising";
  if (recent < prior * 0.85) return "Decreasing";
  return "Stable";
}

export async function fetchCdcRespiratory(): Promise<RespiratoryIllness> {
  const token = process.env.CDC_APP_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;

  const url =
    `https://data.cdc.gov/resource/aemt-mg7g.json` +
    `?jurisdiction=TX&$order=week_end_date%20DESC&$limit=6`;

  const rows = await fetchJson<CdcHospRow[]>(url, { headers });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("CDC dataset returned no rows for TX");
  }

  // Oldest week first for plotting
  const weeks = rows.slice().reverse();

  const rsvSeries = weeks.map((r) =>
    pickNum(r.totalconfrsvnewadmped, r.totalconfrsvnewadm),
  );
  const fluSeries = weeks.map((r) =>
    pickNum(r.totalconfflunewadmped, r.totalconfflunewadm),
  );
  const covidSeries = weeks.map((r) =>
    pickNum(r.totalconfc19newadmped, r.totalconfc19newadm),
  );
  const edSeries = weeks.map(
    (_, i) => rsvSeries[i] + fluSeries[i] + covidSeries[i],
  );

  const latest = (s: number[]) => s[s.length - 1] ?? 0;

  // Thresholds are pragmatic defaults for TX weekly admissions. Tune over time.
  const rsvLevel = classifyLevel(latest(rsvSeries), 50, 200);
  const fluLevel = classifyLevel(latest(fluSeries), 100, 400);
  const covidLevel = classifyLevel(latest(covidSeries), 100, 400);

  const rsvTrend = classifyTrend(rsvSeries);
  const fluTrend = classifyTrend(fluSeries);
  const covidTrend = classifyTrend(covidSeries);
  const edRespiratoryVisitTrend = classifyTrend(edSeries);

  const weeklyTrend = weeks.map((r, i) => ({
    weekLabel:
      i === weeks.length - 1
        ? "This wk"
        : `Wk -${weeks.length - 1 - i}`,
    rsv: rsvSeries[i] ?? 0,
    flu: fluSeries[i] ?? 0,
    covid: covidSeries[i] ?? 0,
    edRespiratoryVisits: edSeries[i] ?? 0,
  }));

  const concerns: string[] = [];
  if (rsvTrend === "Rising") concerns.push("RSV rising");
  if (fluTrend === "Rising") concerns.push("flu rising");
  if (covidTrend === "Rising") concerns.push("COVID rising");
  if (edRespiratoryVisitTrend === "Rising")
    concerns.push("ED respiratory visits rising");

  const providerNote =
    concerns.length > 0
      ? `Regional respiratory signals: ${concerns.join(", ")}. Anticipate more cough, congestion, wheezing, and fever-related calls.`
      : "Regional respiratory activity is stable across RSV, flu, and COVID.";

  return {
    rsvLevel,
    rsvTrend,
    fluLevel,
    fluTrend,
    covidLevel,
    covidTrend,
    edRespiratoryVisitTrend,
    wastewaterTrend:
      "Regional wastewater signal available at metro level only; not yet broken out by ZIP for the North Dallas area.",
    geography: "Texas (state-level hospitalization metrics)",
    weeklyTrend,
    providerNote,
    source: "CDC / Texas DSHS",
    lastUpdated: todayIso(),
  };
}
