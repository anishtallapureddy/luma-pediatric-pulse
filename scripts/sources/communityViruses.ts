import type {
  CommunityVirusEntry,
  CommunityVirusWatch,
  SignalLevel,
  TrendDirection,
} from "../../src/types/health-watch";
import { mockProviderHealthWatchData } from "../../src/lib/health-watch/mock-data";
import { fetchJson, todayIso } from "./_common";
import {
  loadManualEntericSnapshot,
  type EntericVirus,
  type ManualEntericSnapshot,
} from "./nrevssEntericManual";

const NREVSS_DATASET_URL =
  "https://data.cdc.gov/resource/rgnm-fkqb.json";
const NATIONAL_RESPIRATORY_DATASET_URL =
  "https://data.cdc.gov/resource/seuz-s2cv.json";
const NREVSS_DASHBOARD_URL =
  "https://www.cdc.gov/nrevss/php/dashboard/index.html";

interface RgnmRow {
  mmwrweek_end?: string;
  level?: string;
  state?: string;
  pathogen?: string;
  subtype?: string;
  percent_pos?: string;
  percent_pos_3wma?: string;
  posted?: string;
}

interface SeuzRow {
  week_end?: string;
  pathogen?: string;
  percent_test_positivity?: string;
}

interface VirusSeries {
  weeks: string[];
  values: number[];
  weeklyTestsReported?: number[];
  posted?: string;
}

interface SeriesCollection {
  byPathogen: Record<string, VirusSeries>;
  latestWeek: string;
}

const REGION_6_PATHOGENS: Record<string, string> = {
  "rhino-entero": "RV/EV",
  hmpv: "HMPV",
  parainfluenza: "PIV",
  adenovirus: "Adenovirus",
};

const TEXAS_PATHOGENS: Record<string, string> = {
  rsv: "RSV",
  covid: "SARS-COV-2",
};

function classifyPositivity(pct: number): SignalLevel {
  if (!Number.isFinite(pct) || pct < 0) return "Unknown";
  if (pct < 2) return "Low";
  if (pct < 5) return "Moderate";
  if (pct < 10) return "High";
  return "Very High";
}

function classifyTrend(series: number[]): TrendDirection {
  const valid = series.filter((n) => Number.isFinite(n));
  if (valid.length < 3) return "Stable";
  const recent = valid.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const prior =
    valid.slice(0, -2).reduce((a, b) => a + b, 0) /
    Math.max(1, valid.length - 2);
  if (prior < 0.1) return recent > 1 ? "Rising" : "Stable";
  if (recent > prior * 1.2) return "Rising";
  if (recent < prior * 0.8) return "Decreasing";
  return "Stable";
}

function trendPhrase(trend: TrendDirection): string {
  if (trend === "Rising") return "increasing";
  if (trend === "Decreasing") return "easing";
  return "stable";
}

function trendLabel(trend: TrendDirection): string {
  if (trend === "Rising") return "rising";
  if (trend === "Decreasing") return "easing";
  return "stable";
}

function makeQuantitativeEntry(
  base: CommunityVirusEntry,
  series: VirusSeries,
  sourceName: string,
  sourceUrl: string,
  geography: string,
  metric: string,
  fetchedAt: string,
): CommunityVirusEntry {
  const latest = series.values[series.values.length - 1];
  const sourceReportingDate = series.weeks[series.weeks.length - 1];
  if (!Number.isFinite(latest) || !sourceReportingDate) {
    throw new Error(`${base.name} series has no valid latest observation`);
  }
  const trend = classifyTrend(series.values);
  const positivityPct = Number(latest.toFixed(1));
  return {
    ...base,
    level: classifyPositivity(latest),
    trend,
    positivityPct,
    surveillanceKind: "quantitative",
    statusLabel: `${positivityPct.toFixed(1)}% positive - ${trendLabel(trend)}`,
    sourceName,
    sourceUrl,
    geography,
    sourceReportingDate,
    fetchedAt,
    metric,
    weeklyValues: series.weeks.map((weekEnding, index) => ({
      weekEnding,
      value: Number(series.values[index].toFixed(2)),
      weeklyTestsReported: series.weeklyTestsReported?.[index],
    })),
    stale: false,
    parentNote: `${base.name} laboratory test positivity is ${trendPhrase(trend)} ${geography === "United States" ? "in the" : "in"} ${geography}.`,
    providerNote: `${sourceName}, ${geography}, week ending ${sourceReportingDate.slice(0, 10)}: ${positivityPct.toFixed(1)}% of reported tests were positive.`,
  };
}

function preservePreviousEntry(
  base: CommunityVirusEntry,
  previous: CommunityVirusWatch | undefined,
  reason: string,
): CommunityVirusEntry {
  const prior = previous?.entries.find((entry) => entry.key === base.key);
  if (prior && typeof prior.positivityPct === "number") {
    return {
      ...prior,
      stale: true,
      providerNote: `${prior.providerNote} Latest refresh failed: ${reason}`,
    };
  }
  return {
    ...base,
    level: "Unknown",
    trend: undefined,
    positivityPct: undefined,
    surveillanceKind: "limited",
    statusLabel: "Temporarily unavailable",
    stale: true,
    providerNote: `No validated value is available because the source refresh failed: ${reason}`,
  };
}

function staticEntry(
  base: CommunityVirusEntry,
  fetchedAt: string,
): CommunityVirusEntry {
  if (base.key === "norovirus" || base.key === "rotavirus") {
    return {
      ...base,
      level: "Unknown",
      trend: undefined,
      positivityPct: undefined,
      surveillanceKind: "regional",
      statusLabel: "Regional surveillance only",
      sourceName: "CDC NREVSS",
      sourceUrl: NREVSS_DASHBOARD_URL,
      geography: "Southern U.S. Census Region",
      fetchedAt,
      metric:
        "Weekly laboratory test positivity is published in the CDC dashboard; no supported automated export is available.",
      stale: false,
      parentNote:
        base.key === "norovirus"
          ? "CDC tracks norovirus across the Southern U.S., but a reliable current local activity level is not available."
          : "CDC tracks rotavirus across the Southern U.S., but a reliable current local activity level is not available.",
      providerNote:
        "Current regional values are available in the official CDC NREVSS dashboard. They are not ingested automatically because CDC does not provide a supported public API or stable export.",
    };
  }

  if (base.key === "hfmd") {
    return {
      ...base,
      level: "Unknown",
      trend: undefined,
      positivityPct: undefined,
      surveillanceKind: "seasonal",
      statusLabel: "Seasonal watch",
      sourceName: "CDC and Texas DSHS guidance",
      sourceUrl: "https://www.cdc.gov/hand-foot-mouth/about/index.html",
      geography: "Seasonal context; not a local activity estimate",
      fetchedAt,
      metric: "Seasonal context only; no routine local prevalence feed",
      stale: false,
      parentNote:
        "HFMD commonly circulates in summer and fall, especially in childcare and school settings.",
      providerNote:
        "Seasonal watch only. Do not infer a local outbreak without an official Texas DSHS or local health department notice.",
    };
  }

  return {
    ...base,
    level: "Unknown",
    trend: undefined,
    positivityPct: undefined,
    surveillanceKind: "limited",
    statusLabel: "Local surveillance limited",
    sourceName: "CDC",
    sourceUrl: "https://www.cdc.gov/parvovirus-b19/about/index.html",
    geography: "No routine local surveillance",
    fetchedAt,
    metric: "No routine public surveillance signal",
    stale: false,
    parentNote:
      "Routine local Parvovirus B19 surveillance is limited, so a reliable current local activity level is not available.",
    providerNote:
      "Parvovirus B19 is not nationally notifiable and has no routine U.S. surveillance feed. Use official health advisories only when issued.",
  };
}

function makeManualEntericEntry(
  base: CommunityVirusEntry,
  manual: ManualEntericSnapshot,
  virus: EntericVirus,
): CommunityVirusEntry {
  const points = manual.series[virus];
  const latest = points[points.length - 1];
  const ageDays =
    (Date.now() -
      new Date(`${latest.weekEnding}T00:00:00.000Z`).getTime()) /
    86_400_000;
  const stale = ageDays > 21;
  const entry = makeQuantitativeEntry(
    base,
    {
      weeks: points.map((point) => point.weekEnding),
      values: points.map((point) => point.percentPositive),
      weeklyTestsReported: points.map(
        (point) => point.weeklyTestsReported,
      ),
    },
    "CDC NREVSS (controlled weekly import)",
    manual.sourceUrl,
    manual.geography,
    manual.metric,
    manual.importedAt,
  );
  return {
    ...entry,
    stale,
    parentNote: stale
      ? `The latest controlled ${virus} import is more than three weeks old. The retained regional trend may not reflect current activity.`
      : entry.parentNote,
    statusLabel: `${latest.percentPositive.toFixed(1)}% positive (centered 3-week average) - ${trendLabel(entry.trend ?? "Stable")}`,
    providerNote: `CDC NREVSS, ${manual.geography}, centered three-week average ending ${latest.weekEnding}: ${latest.percentPositive.toFixed(1)}% positive. CDC displayed ${latest.weeklyTestsReported.toLocaleString("en-US")} tests for the specified week; dashboard updated ${manual.sourceUpdated}.`,
  };
}

async function fetchWithRetry<T>(
  label: string,
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      try {
        return await fetchJson<T>(url, {
          ...init,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts`, {
    cause: lastError,
  });
}

function groupRgnmRows(
  rows: RgnmRow[],
  valueField: "percent_pos" | "percent_pos_3wma",
): SeriesCollection {
  const grouped: Record<
    string,
    Array<{ week: string; value: number; posted?: string }>
  > = {};
  for (const row of rows) {
    if (!row.pathogen || !row.mmwrweek_end) continue;
    const value = Number(row[valueField]);
    if (!Number.isFinite(value)) continue;
    grouped[row.pathogen] ??= [];
    grouped[row.pathogen].push({
      week: row.mmwrweek_end,
      value,
      posted: row.posted,
    });
  }

  const byPathogen: Record<string, VirusSeries> = {};
  let latestWeek = "";
  for (const [pathogen, entries] of Object.entries(grouped)) {
    const seen = new Set<string>();
    const recent = entries
      .filter((entry) => {
        if (seen.has(entry.week)) return false;
        seen.add(entry.week);
        return true;
      })
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-6);
    if (recent.length === 0) continue;
    byPathogen[pathogen] = {
      weeks: recent.map((entry) => entry.week),
      values: recent.map((entry) => entry.value),
      posted: recent[recent.length - 1]?.posted,
    };
    const last = recent[recent.length - 1]?.week;
    if (last && last > latestWeek) latestWeek = last;
  }
  return { byPathogen, latestWeek };
}

async function fetchRegion6Series(): Promise<SeriesCollection> {
  const params = new URLSearchParams({
    "$where":
      "level='Region 6' AND (" +
      "(pathogen IN('Adenovirus','HMPV','RV/EV') AND subtype IS NULL) OR " +
      "(pathogen='PIV' AND subtype IN('Combined Type','Combined Types'))" +
      ")",
    "$order": "mmwrweek_end DESC",
    "$limit": "100",
  });
  const rows = await fetchWithRetry<RgnmRow[]>(
    "NREVSS Region 6",
    `${NREVSS_DATASET_URL}?${params.toString()}`,
    cdcHeaders(),
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("NREVSS returned no HHS Region 6 rows");
  }
  return groupRgnmRows(rows, "percent_pos");
}

async function fetchTexasSeries(): Promise<SeriesCollection> {
  const params = new URLSearchParams({
    "$where":
      "level='State' AND state='TX' AND pathogen IN('RSV','SARS-COV-2')",
    "$order": "mmwrweek_end DESC",
    "$limit": "100",
  });
  const rows = await fetchWithRetry<RgnmRow[]>(
    "NREVSS Texas",
    `${NREVSS_DATASET_URL}?${params.toString()}`,
    cdcHeaders(),
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("NREVSS returned no Texas rows");
  }
  return groupRgnmRows(rows, "percent_pos_3wma");
}

async function fetchNationalFluSeries(): Promise<VirusSeries> {
  const params = new URLSearchParams({
    pathogen: "Influenza",
    "$order": "week_end DESC",
    "$limit": "6",
  });
  const rows = await fetchWithRetry<SeuzRow[]>(
    "CDC national influenza",
    `${NATIONAL_RESPIRATORY_DATASET_URL}?${params.toString()}`,
    cdcHeaders(),
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("CDC national respiratory dataset returned no Influenza rows");
  }
  const recent = rows
    .filter(
      (row) =>
        row.week_end &&
        Number.isFinite(Number(row.percent_test_positivity)),
    )
    .sort((a, b) => a.week_end!.localeCompare(b.week_end!))
    .slice(-6);
  if (recent.length === 0) {
    throw new Error("CDC national influenza rows had no valid positivity values");
  }
  return {
    weeks: recent.map((row) => row.week_end!),
    values: recent.map((row) => Number(row.percent_test_positivity)),
  };
}

function cdcHeaders(): RequestInit {
  const headers: Record<string, string> = {
    "User-Agent": "luma-pediatric-pulse/1.0",
  };
  const token = process.env.CDC_APP_TOKEN;
  if (token) headers["X-App-Token"] = token;
  return { headers };
}

export async function fetchCommunityVirusWatch(
  previous?: CommunityVirusWatch,
): Promise<CommunityVirusWatch> {
  const baseline = mockProviderHealthWatchData.communityVirusWatch;
  if (!baseline) {
    throw new Error("communityVirusWatch baseline missing from mock data");
  }

  const fetchedAt = todayIso();
  let manualEnteric: ManualEntericSnapshot | undefined;
  let manualEntericError: string | undefined;
  try {
    manualEnteric = loadManualEntericSnapshot();
  } catch (error) {
    manualEntericError =
      error instanceof Error ? error.message : String(error);
  }
  const [region6Result, texasResult, fluResult] = await Promise.allSettled([
    fetchRegion6Series(),
    fetchTexasSeries(),
    fetchNationalFluSeries(),
  ]);
  const errors: string[] = [];
  if (region6Result.status === "rejected") {
    errors.push(`HHS Region 6: ${String(region6Result.reason)}`);
  }
  if (texasResult.status === "rejected") {
    errors.push(`Texas: ${String(texasResult.reason)}`);
  }
  if (fluResult.status === "rejected") {
    errors.push(`Influenza: ${String(fluResult.reason)}`);
  }
  if (manualEntericError) {
    errors.push(`Manual enteric import: ${manualEntericError}`);
  }

  const entries = baseline.entries.map((base): CommunityVirusEntry => {
    if (base.key === "norovirus" || base.key === "rotavirus") {
      if (manualEnteric) {
        return makeManualEntericEntry(
          base,
          manualEnteric,
          base.key === "norovirus" ? "Norovirus" : "Rotavirus",
        );
      }
      const prior = previous?.entries.find(
        (entry) =>
          entry.key === base.key &&
          typeof entry.positivityPct === "number",
      );
      if (manualEntericError || prior) {
        return preservePreviousEntry(
          base,
          previous,
          manualEntericError ?? "manual NREVSS import file is missing",
        );
      }
      return staticEntry(base, fetchedAt);
    }

    if (
      base.key === "hfmd" ||
      base.key === "fifth-disease"
    ) {
      return staticEntry(base, fetchedAt);
    }

    if (base.key === "influenza") {
      if (fluResult.status === "fulfilled") {
        return makeQuantitativeEntry(
          base,
          fluResult.value,
          "CDC national respiratory laboratory surveillance",
          "https://data.cdc.gov/d/seuz-s2cv",
          "United States",
          "Percent of clinical laboratory influenza tests positive",
          fetchedAt,
        );
      }
      return preservePreviousEntry(base, previous, String(fluResult.reason));
    }

    const texasPathogen = TEXAS_PATHOGENS[base.key];
    if (texasPathogen) {
      const series =
        texasResult.status === "fulfilled"
          ? texasResult.value.byPathogen[texasPathogen]
          : undefined;
      if (series) {
        return makeQuantitativeEntry(
          base,
          series,
          "CDC NREVSS",
          "https://data.cdc.gov/d/rgnm-fkqb",
          "Texas",
          "Centered three-week average percent of NAAT laboratory tests positive",
          fetchedAt,
        );
      }
      const reason =
        texasResult.status === "rejected"
          ? String(texasResult.reason)
          : `${texasPathogen} was missing from the Texas response`;
      return preservePreviousEntry(base, previous, reason);
    }

    const regionPathogen = REGION_6_PATHOGENS[base.key];
    if (regionPathogen) {
      const series =
        region6Result.status === "fulfilled"
          ? region6Result.value.byPathogen[regionPathogen]
          : undefined;
      if (series) {
        return makeQuantitativeEntry(
          base,
          series,
          "CDC NREVSS",
          "https://data.cdc.gov/d/rgnm-fkqb",
          "HHS Region 6 (AR, LA, NM, OK, TX)",
          "Weekly percent of NAAT laboratory tests positive",
          fetchedAt,
        );
      }
      const reason =
        region6Result.status === "rejected"
          ? String(region6Result.reason)
          : `${regionPathogen} was missing from the HHS Region 6 response`;
      return preservePreviousEntry(base, previous, reason);
    }

    return {
      ...base,
      level: "Unknown",
      trend: undefined,
      positivityPct: undefined,
      surveillanceKind: "limited",
      statusLabel: "Surveillance definition unavailable",
      stale: true,
    };
  });

  const staleEntries = entries.filter((entry) => entry.stale);
  const reportingDates = entries
    .map((entry) => entry.sourceReportingDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestReportingDate = reportingDates[reportingDates.length - 1];

  return {
    source: "CDC NREVSS and CDC national respiratory laboratory surveillance",
    sourceUrl: NREVSS_DASHBOARD_URL,
    geography: "Texas, HHS Region 6, and United States; see each card",
    reportingDate: latestReportingDate,
    fetchedAt,
    metric: "Laboratory test positivity; metric and geography vary by virus",
    lastUpdated: fetchedAt,
    entries,
    providerNote:
      "Each quantitative value identifies its source geography and reporting week. Non-quantitative cards do not imply current local activity.",
    stale: staleEntries.length > 0,
    staleSince:
      staleEntries.length > 0
        ? previous?.staleSince ?? previous?.lastUpdated ?? fetchedAt
        : undefined,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
