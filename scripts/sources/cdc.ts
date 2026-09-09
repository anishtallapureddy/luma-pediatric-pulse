import type {
  RespiratoryIllness,
  SignalLevel,
  TrendDirection,
} from "../../src/types/health-watch";
import { fetchJson, todayIso } from "./_common";

/**
 * Pulls weekly laboratory-confirmed respiratory hospitalization rates from
 * Texas DSHS for Public Health Region 2/3, which includes Collin County.
 */
interface DshsHospitalizationAttributes {
  week_ending?: number;
  geo?: string;
  covid_rate?: number;
  flu_rate?: number;
  rsv_rate?: number;
}

interface DshsHospitalizationResponse {
  error?: { message?: string };
  features?: Array<{ attributes?: DshsHospitalizationAttributes }>;
}

function rate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Texas DSHS returned an invalid ${field}`);
  }
  return value;
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

function roundedRate(value: number): number {
  return Number(value.toFixed(1));
}

export async function fetchCdcRespiratory(): Promise<RespiratoryIllness> {
  const sourceUrl =
    "https://services3.arcgis.com/vljlarU2635mITsl/arcgis/rest/services/" +
    "COVID_Influenza_RSV_Hospitalization_Rates/FeatureServer/0";
  const params = new URLSearchParams({
    where: "geo='PHR 2/3'",
    outFields: "week_ending,geo,covid_rate,flu_rate,rsv_rate",
    returnGeometry: "false",
    orderByFields: "week_ending DESC",
    resultRecordCount: "6",
    f: "json",
  });
  const response = await fetchJson<DshsHospitalizationResponse>(
    `${sourceUrl}/query?${params.toString()}`,
  );
  if (response.error) {
    throw new Error(
      `Texas DSHS ArcGIS query failed: ${response.error.message ?? "unknown error"}`,
    );
  }
  const attributes = (response.features ?? [])
    .map((feature) => feature.attributes)
    .filter(
      (item): item is DshsHospitalizationAttributes =>
        item !== undefined && typeof item.week_ending === "number",
    );
  if (attributes.length === 0) {
    throw new Error("Texas DSHS returned no PHR 2/3 hospitalization rows");
  }

  const weeks = attributes.sort(
    (a, b) => (a.week_ending ?? 0) - (b.week_ending ?? 0),
  );
  const rsvSeries = weeks.map((row) => rate(row.rsv_rate, "RSV rate"));
  const fluSeries = weeks.map((row) => rate(row.flu_rate, "influenza rate"));
  const covidSeries = weeks.map((row) => rate(row.covid_rate, "COVID-19 rate"));
  const combinedSeries = weeks.map(
    (_, i) => rsvSeries[i] + fluSeries[i] + covidSeries[i],
  );

  const latest = (s: number[]) => s[s.length - 1] ?? 0;

  const rsvTrend = classifyTrend(rsvSeries);
  const fluTrend = classifyTrend(fluSeries);
  const covidTrend = classifyTrend(covidSeries);
  const hospitalAdmissionTrend = classifyTrend(combinedSeries);

  const weeklyTrend = weeks.map((r, i) => ({
    weekLabel:
      i === weeks.length - 1
        ? "This wk"
        : `Wk -${weeks.length - 1 - i}`,
    rsv: roundedRate(rsvSeries[i] ?? 0),
    flu: roundedRate(fluSeries[i] ?? 0),
    covid: roundedRate(covidSeries[i] ?? 0),
    hospitalAdmissions: roundedRate(combinedSeries[i] ?? 0),
  }));

  const concerns: string[] = [];
  if (rsvTrend === "Rising") concerns.push("RSV rising");
  if (fluTrend === "Rising") concerns.push("flu rising");
  if (covidTrend === "Rising") concerns.push("COVID rising");
  if (hospitalAdmissionTrend === "Rising")
    concerns.push("combined hospital admission rate rising");

  const providerNote =
    concerns.length > 0
      ? `PHR 2/3 hospitalization signals: ${concerns.join(", ")}. Rates are weekly new laboratory-confirmed admissions per 100,000.`
      : "PHR 2/3 hospitalization rates are stable across RSV, influenza, and COVID-19.";
  const latestWeek = weeks[weeks.length - 1];
  const reportingDate = new Date(latestWeek.week_ending!).toISOString();
  const fetchedAt = todayIso();

  return {
    rsvLevel: "Unknown" as SignalLevel,
    rsvTrend,
    fluLevel: "Unknown" as SignalLevel,
    fluTrend,
    covidLevel: "Unknown" as SignalLevel,
    covidTrend,
    hospitalAdmissionTrend,
    currentHospitalizationRates: {
      rsv: roundedRate(latest(rsvSeries)),
      flu: roundedRate(latest(fluSeries)),
      covid: roundedRate(latest(covidSeries)),
      combined: roundedRate(latest(combinedSeries)),
    },
    wastewaterTrend:
      "Wastewater is not included in this hospitalization dataset.",
    geography: "Texas DSHS Public Health Region 2/3",
    weeklyTrend,
    providerNote,
    source: "Texas DSHS respiratory hospitalization surveillance",
    sourceUrl,
    reportingDate,
    fetchedAt,
    metric: "Weekly new laboratory-confirmed hospital admissions per 100,000",
    lastUpdated: fetchedAt,
  };
}
