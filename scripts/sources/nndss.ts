import type {
  VaccinePreventableDisease,
  VaccinePreventableSection,
  VpdStatus,
  TrendDirection,
} from "../../src/types/health-watch";
import { fetchJson, todayIso } from "./_common";

/**
 * Vaccine-preventable disease activity for Texas (state-level NNDSS reports).
 *
 * Source: CDC NNDSS Weekly Data on data.cdc.gov.
 *   Default dataset: x9gk-5huc (consolidated weekly cases, updated weekly).
 *   Can be overridden via CDC_NNDSS_DATASET_ID env var if CDC changes the ID.
 *
 * Schema (x9gk-5huc):
 *   states     - reporting jurisdiction (we filter "Texas")
 *   year, week - MMWR year/week
 *   label      - disease name (e.g., "Measles, Indigenous", "Pertussis")
 *   m1         - current week cases (absent => 0 or not yet reported)
 *   m2         - previous 52-week max
 *   m3         - cumulative YTD current year
 *   m4         - cumulative YTD previous year
 *
 * If the dataset is unavailable or schema changes, this throws and the
 * refresh orchestrator keeps the prior snapshot, marked stale.
 */

interface NndssRow {
  states?: string;
  year?: string;
  week?: string;
  label?: string;
  m1?: string;
  m2?: string;
  m3?: string;
  m4?: string;
}

interface DiseaseSpec {
  diseaseName: string;
  // Labels to sum (e.g., "Measles, Imported" + "Measles, Indigenous").
  labelIncludes: string[];
  vaccineRelevance: string;
  suggestedProviderAction: string;
  // Thresholds applied to YTD cases for Texas.
  watchYtd: number;
  outbreakYtd: number;
}

const DEFAULT_DATASET_ID = "x9gk-5huc";

const DISEASES: DiseaseSpec[] = [
  {
    diseaseName: "Measles",
    labelIncludes: ["Measles, Indigenous", "Measles, Imported"],
    vaccineRelevance:
      "MMR-preventable. Highly contagious; airborne. Confirm MMR1 (12-15 mo) and MMR2 (4-6 yr) at every visit.",
    suggestedProviderAction:
      "Verify MMR status, prompt catch-up doses, and review measles isolation/notification protocol with staff.",
    // Measles: even 1 case warrants watch; baseline TX historically <10/yr.
    watchYtd: 1,
    outbreakYtd: 10,
  },
  {
    diseaseName: "Pertussis (whooping cough)",
    labelIncludes: ["Pertussis"],
    vaccineRelevance:
      "DTaP/Tdap-preventable. Infants under 2 mo are highest-risk. Confirm caregiver Tdap (cocooning).",
    suggestedProviderAction:
      "Low threshold for testing prolonged paroxysmal cough; confirm DTaP series and Tdap for adolescents.",
    // TX baseline pertussis: 200-500/yr. Watch = >2x typical pace.
    watchYtd: 400,
    outbreakYtd: 1000,
  },
  {
    diseaseName: "Hepatitis A",
    labelIncludes: ["Hepatitis A, Confirmed"],
    vaccineRelevance: "HepA-preventable. Two-dose series starting at 12 mo.",
    suggestedProviderAction:
      "Confirm HepA series at well visits; emphasize for travel to endemic regions.",
    // TX baseline HepA: 50-150/yr.
    watchYtd: 75,
    outbreakYtd: 200,
  },
  {
    diseaseName: "Varicella (chickenpox)",
    labelIncludes: ["Varicella disease", "Varicella morbidity"],
    vaccineRelevance:
      "Varicella-preventable. Two-dose series (12-15 mo, 4-6 yr).",
    suggestedProviderAction:
      "Confirm two-dose varicella status at school-age visits; counsel on rash isolation.",
    // TX baseline varicella: ~200-500/yr.
    watchYtd: 250,
    outbreakYtd: 600,
  },
  {
    diseaseName: "Mumps",
    labelIncludes: ["Mumps"],
    vaccineRelevance:
      "MMR-preventable. Outbreaks often occur in close-contact settings (camps, schools).",
    suggestedProviderAction:
      "Confirm MMR2 in school-age and adolescents; review parotitis differential during outbreaks.",
    // TX baseline mumps: 5-30/yr typical.
    watchYtd: 15,
    outbreakYtd: 50,
  },
  {
    diseaseName: "Invasive pneumococcal disease (age <5)",
    labelIncludes: [
      "Invasive pneumococcal disease, age <5 years, Confirmed",
      "Invasive pneumococcal disease, age <5 years, Probable",
    ],
    vaccineRelevance:
      "PCV15/PCV20-preventable. Series at 2, 4, 6, 12-15 mo.",
    suggestedProviderAction:
      "Confirm PCV series; review post-splenectomy and high-risk indications.",
    // TX baseline pediatric IPD: 20-50/yr.
    watchYtd: 30,
    outbreakYtd: 75,
  },
];

function classifyStatus(
  ytd: number,
  weeklyMax: number,
  watch: number,
  outbreak: number,
): VpdStatus {
  if (ytd >= outbreak) return "Active outbreak";
  if (ytd >= watch) return "Outbreak watch";
  if (ytd > 0 || weeklyMax > 0) return "Sporadic";
  return "No recent cases";
}

function classifyTrend(currentWeek: number, prevMax: number): TrendDirection {
  // If the latest week has 0 cases (very common — NNDSS state reports lag by 2-6 weeks),
  // treat as Stable to avoid misleading "Decreasing" labels on real outbreaks.
  if (currentWeek === 0) return "Stable";
  if (prevMax === 0) return currentWeek > 0 ? "Rising" : "Stable";
  if (currentWeek > prevMax * 1.15) return "Rising";
  if (currentWeek < prevMax * 0.85) return "Decreasing";
  return "Stable";
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchTexasNndssRows(): Promise<NndssRow[]> {
  const datasetId = process.env.CDC_NNDSS_DATASET_ID || DEFAULT_DATASET_ID;
  const token = process.env.CDC_APP_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;

  // Build OR clause across all relevant label variants.
  const labels = Array.from(
    new Set(DISEASES.flatMap((d) => d.labelIncludes)),
  );
  const labelClause = labels
    .map((l) => `label='${l.replace(/'/g, "''")}'`)
    .join(" OR ");

  const currentYear = new Date().getUTCFullYear();
  const where = `states='Texas' AND year='${currentYear}' AND (${labelClause})`;
  const url =
    `https://data.cdc.gov/resource/${encodeURIComponent(datasetId)}.json` +
    `?$where=${encodeURIComponent(where)}&$limit=5000`;

  const rows = await fetchJson<NndssRow[]>(url, { headers });
  if (!Array.isArray(rows)) {
    throw new Error("NNDSS returned unexpected payload");
  }
  return rows;
}

export async function fetchVaccinePreventable(): Promise<VaccinePreventableSection> {
  const rows = await fetchTexasNndssRows();

  // Index rows by label, then collapse to (currentWeekCases, maxWeeklyYTD, ytdMaxAcrossWeeks).
  const byLabel = new Map<string, NndssRow[]>();
  for (const r of rows) {
    const label = r.label ?? "";
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(r);
  }

  // Latest week present in the dataset for Texas.
  const allWeeks = rows
    .map((r) => Number(r.week ?? "0"))
    .filter((n) => Number.isFinite(n) && n > 0);
  const latestWeek = allWeeks.length ? Math.max(...allWeeks) : 0;

  const items: VaccinePreventableDisease[] = [];

  for (const spec of DISEASES) {
    let currentWeekCases = 0;
    let weeklyMax = 0;
    let ytdMax = 0;

    for (const label of spec.labelIncludes) {
      const labelRows = byLabel.get(label) ?? [];
      for (const r of labelRows) {
        const wk = Number(r.week ?? "0");
        const m1 = num(r.m1);
        const m2 = num(r.m2);
        const m3 = num(r.m3);
        if (wk === latestWeek) currentWeekCases += m1;
        if (m2 > weeklyMax) weeklyMax = m2;
        if (m3 > ytdMax) ytdMax = m3;
      }
    }

    const status = classifyStatus(
      ytdMax,
      weeklyMax,
      spec.watchYtd,
      spec.outbreakYtd,
    );
    const trend = classifyTrend(currentWeekCases, weeklyMax);

    items.push({
      diseaseName: spec.diseaseName,
      status,
      recentCases: ytdMax > 0 ? ytdMax : currentWeekCases,
      trend,
      geography: `Texas (state-level, YTD through MMWR week ${latestWeek || "?"})`,
      vaccineRelevance: spec.vaccineRelevance,
      suggestedProviderAction: spec.suggestedProviderAction,
      lastUpdated: todayIso(),
    });
  }

  return {
    source: "CDC NNDSS Weekly Data (Texas)",
    lastUpdated: todayIso(),
    items,
  };
}
