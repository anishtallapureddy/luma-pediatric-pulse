import type {
  CommunityVirusEntry,
  CommunityVirusWatch,
  SignalLevel,
  TrendDirection,
} from "../../src/types/health-watch";
import { mockProviderHealthWatchData } from "../../src/lib/health-watch/mock-data";
import { fetchJson, todayIso } from "./_common";

/**
 * Community virus watch — real CDC data where available.
 *
 * Data sources (all free public Socrata APIs, no key required):
 *   1. rgnm-fkqb — NREVSS % positivity by HHS Region. We pull HHS Region 6
 *      (TX/AR/LA/NM/OK) weekly data for: RSV, Adenovirus, SARS-CoV-2,
 *      HMPV, Parainfluenza (PIV), Rhinovirus/Enterovirus (RV/EV).
 *   2. seuz-s2cv — National weekly % positivity for Influenza, RSV, COVID-19.
 *      We use the Influenza combined value as a proxy for Flu A and Flu B
 *      (CDC does not break out subtypes in this Socrata endpoint).
 *
 * Viruses without a clean public live-surveillance API for our region
 * (Norovirus, Rotavirus, Hand-Foot-and-Mouth, Parvovirus B19) are marked
 * as Unknown / stale=true with a parent-friendly note explaining the gap.
 *
 * Optional env: CDC_APP_TOKEN avoids the unauthenticated Socrata rate limit.
 */

interface RgnmRow {
  mmwrweek_end?: string;
  level?: string;
  pathogen?: string;
  subtype?: string;
  percent_pos?: string;
  percent_pos_3wma?: string;
}

interface SeuzRow {
  week_end?: string;
  pathogen?: string;
  percent_test_positivity?: string;
}

/** Classify NREVSS / NAAT % positivity into a SignalLevel. */
function classifyPositivity(pct: number): SignalLevel {
  if (!Number.isFinite(pct) || pct < 0) return "Unknown";
  if (pct < 2) return "Low";
  if (pct < 5) return "Moderate";
  if (pct < 10) return "High";
  return "Very High";
}

/** Compare recent 2 weeks vs prior ~4 weeks to call a trend. */
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

/** Build a per-virus entry from a series of recent weekly % positivity values. */
function makeEntry(
  base: CommunityVirusEntry,
  series: number[],
  sourceLabel: string,
  asOfWeek: string,
): CommunityVirusEntry {
  const latest = series[series.length - 1] ?? NaN;
  const level = classifyPositivity(latest);
  const trend = classifyTrend(series);
  return {
    ...base,
    level,
    trend,
    positivityPct: Number.isFinite(latest) ? Number(latest.toFixed(1)) : undefined,
    providerNote: `${sourceLabel} — week ending ${asOfWeek.slice(0, 10)}: ${
      Number.isFinite(latest) ? `${latest.toFixed(1)}% positivity` : "no data"
    }, ${trend.toLowerCase()} vs. prior weeks.`,
  };
}

/** Map our virus display name → the pathogen code used in CDC datasets. */
const NREVSS_MAP: Record<string, string> = {
  RSV: "RSV",
  "COVID-19": "SARS-COV-2",
  "Rhinovirus / Enterovirus": "RV/EV",
  "Human Metapneumovirus (hMPV)": "HMPV",
  Parainfluenza: "PIV",
  Adenovirus: "Adenovirus",
};

/** Viruses without a live regional API — kept honest by marking Unknown/stale. */
const NO_PUBLIC_FEED = new Set([
  "Norovirus",
  "Rotavirus",
  "Hand, Foot & Mouth Disease",
  "Fifth Disease (Parvovirus B19)",
]);

async function fetchRegion6Series(): Promise<{
  byPathogen: Record<string, { weeks: string[]; values: number[] }>;
  latestWeek: string;
}> {
  const token = process.env.CDC_APP_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;

  // 8 most-recent weeks, Region 6 only, combined-type rows only where applicable.
  // We over-fetch then aggregate per pathogen because some have subtype rows too.
  const url =
    `https://data.cdc.gov/resource/rgnm-fkqb.json` +
    `?level=Region%206` +
    `&$where=subtype%20IS%20NULL%20OR%20subtype%20IN(%27Combined%20Type%27%2C%27Combined%20Types%27)` +
    `&$order=mmwrweek_end%20DESC&$limit=400`;

  const rows = await fetchJson<RgnmRow[]>(url, { headers });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("NREVSS rgnm-fkqb returned no rows for Region 6");
  }

  // Group by pathogen, sort by week ascending, keep last 6 weeks
  const grouped: Record<string, { week: string; pct: number }[]> = {};
  for (const r of rows) {
    if (!r.pathogen || !r.mmwrweek_end) continue;
    // Skip Adenovirus rows with sub-type rows we don't want (already filtered by subtype IS NULL or combined)
    const pct = Number(r.percent_pos);
    if (!Number.isFinite(pct)) continue;
    if (!grouped[r.pathogen]) grouped[r.pathogen] = [];
    grouped[r.pathogen].push({ week: r.mmwrweek_end, pct });
  }

  const byPathogen: Record<string, { weeks: string[]; values: number[] }> = {};
  let latestWeek = "";
  for (const [path, entries] of Object.entries(grouped)) {
    // Dedupe per week (latest posted wins by virtue of DESC ordering — keep first occurrence)
    const seen = new Set<string>();
    const deduped = entries
      .filter((e) => {
        if (seen.has(e.week)) return false;
        seen.add(e.week);
        return true;
      })
      .sort((a, b) => a.week.localeCompare(b.week));
    const recent = deduped.slice(-6);
    byPathogen[path] = {
      weeks: recent.map((e) => e.week),
      values: recent.map((e) => e.pct),
    };
    const last = recent[recent.length - 1]?.week;
    if (last && last > latestWeek) latestWeek = last;
  }

  return { byPathogen, latestWeek };
}

async function fetchNationalFluSeries(): Promise<{
  weeks: string[];
  values: number[];
  latestWeek: string;
}> {
  const token = process.env.CDC_APP_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;

  const url =
    `https://data.cdc.gov/resource/seuz-s2cv.json` +
    `?pathogen=Influenza&$order=week_end%20DESC&$limit=6`;

  const rows = await fetchJson<SeuzRow[]>(url, { headers });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("seuz-s2cv returned no Influenza rows");
  }
  const sorted = rows
    .slice()
    .reverse()
    .filter((r) => r.week_end && Number.isFinite(Number(r.percent_test_positivity)));
  return {
    weeks: sorted.map((r) => r.week_end!),
    values: sorted.map((r) => Number(r.percent_test_positivity)),
    latestWeek: sorted[sorted.length - 1]?.week_end ?? "",
  };
}

export async function fetchCommunityVirusWatch(): Promise<CommunityVirusWatch> {
  const baseline = mockProviderHealthWatchData.communityVirusWatch;
  if (!baseline) {
    throw new Error("communityVirusWatch baseline missing from mock data");
  }

  const [region6, fluNational] = await Promise.all([
    fetchRegion6Series(),
    fetchNationalFluSeries(),
  ]);

  const fluLatestWeek = fluNational.latestWeek;
  const fluLatest = fluNational.values[fluNational.values.length - 1] ?? NaN;
  const fluLevel = classifyPositivity(fluLatest);
  const fluTrend = classifyTrend(fluNational.values);

  const entries: CommunityVirusEntry[] = baseline.entries.map((base) => {
    const name = base.name;

    if (name === "Influenza A" || name === "Influenza B") {
      return {
        ...base,
        level: fluLevel,
        trend: fluTrend,
        positivityPct: Number.isFinite(fluLatest) ? Number(fluLatest.toFixed(1)) : undefined,
        providerNote: `CDC national clinical-lab surveillance — week ending ${fluLatestWeek.slice(0, 10)}: ${
          Number.isFinite(fluLatest) ? `${fluLatest.toFixed(1)}% positivity` : "no data"
        } for influenza overall (Type A/B subtypes not separated in this feed), ${fluTrend.toLowerCase()} vs. prior weeks.`,
      };
    }

    const nrevssKey = NREVSS_MAP[name];
    if (nrevssKey && region6.byPathogen[nrevssKey]) {
      return makeEntry(
        base,
        region6.byPathogen[nrevssKey].values,
        "CDC NREVSS (HHS Region 6 weekly % positivity)",
        region6.byPathogen[nrevssKey].weeks.slice(-1)[0] ?? region6.latestWeek,
      );
    }

    if (NO_PUBLIC_FEED.has(name)) {
      return {
        ...base,
        level: "Unknown" as SignalLevel,
        trend: "Stable" as TrendDirection,
        positivityPct: undefined,
        providerNote: `No public live regional surveillance feed for ${name}. CDC NoroSTAT and Texas DSHS bulletins update episodically; check those manually for outbreak alerts.`,
      };
    }

    // Fallback: keep baseline values
    return base;
  });

  const haveAnyReal = entries.some(
    (e) => e.level !== "Unknown" || (e.positivityPct ?? -1) >= 0,
  );
  const lastWeek = region6.latestWeek || fluLatestWeek;

  return {
    ...baseline,
    geography: "HHS Region 6 (TX/AR/LA/NM/OK) and national feeds",
    entries,
    lastUpdated: todayIso(),
    stale: !haveAnyReal,
    staleSince: undefined,
    error: undefined,
    providerNote: lastWeek
      ? `Latest CDC NREVSS / FluView data for week ending ${lastWeek.slice(0, 10)}.`
      : baseline.providerNote,
  };
}
