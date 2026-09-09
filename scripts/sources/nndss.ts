import type {
  VaccinePreventableDisease,
  VaccinePreventableSection,
  VpdStatus,
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
  // Each group is one additive component. Labels within a group are
  // alternatives used by different NNDSS vintages and must not be summed.
  labelGroups: string[][];
  vaccineRelevance: string;
  suggestedProviderAction: string;
}

const DEFAULT_DATASET_ID = "x9gk-5huc";

const DISEASES: DiseaseSpec[] = [
  {
    diseaseName: "Measles",
    labelGroups: [["Measles, Indigenous"], ["Measles, Imported"]],
    vaccineRelevance:
      "MMR-preventable. Highly contagious; airborne. Confirm MMR1 (12-15 mo) and MMR2 (4-6 yr) at every visit.",
    suggestedProviderAction:
      "Verify MMR status, prompt catch-up doses, and review measles isolation/notification protocol with staff.",
  },
  {
    diseaseName: "Pertussis (whooping cough)",
    labelGroups: [["Pertussis"]],
    vaccineRelevance:
      "DTaP/Tdap-preventable. Infants under 2 mo are highest-risk. Confirm caregiver Tdap (cocooning).",
    suggestedProviderAction:
      "Low threshold for testing prolonged paroxysmal cough; confirm DTaP series and Tdap for adolescents.",
  },
  {
    diseaseName: "Hepatitis A",
    labelGroups: [["Hepatitis A, Confirmed"]],
    vaccineRelevance: "HepA-preventable. Two-dose series starting at 12 mo.",
    suggestedProviderAction:
      "Confirm HepA series at well visits; emphasize for travel to endemic regions.",
  },
  {
    diseaseName: "Varicella (chickenpox)",
    labelGroups: [["Varicella disease", "Varicella morbidity"]],
    vaccineRelevance:
      "Varicella-preventable. Two-dose series (12-15 mo, 4-6 yr).",
    suggestedProviderAction:
      "Confirm two-dose varicella status at school-age visits; counsel on rash isolation.",
  },
  {
    diseaseName: "Mumps",
    labelGroups: [["Mumps"]],
    vaccineRelevance:
      "MMR-preventable. Outbreaks often occur in close-contact settings (camps, schools).",
    suggestedProviderAction:
      "Confirm MMR2 in school-age and adolescents; review parotitis differential during outbreaks.",
  },
  {
    diseaseName: "Invasive pneumococcal disease (age <5)",
    labelGroups: [
      ["Invasive pneumococcal disease, age <5 years, Confirmed"],
      ["Invasive pneumococcal disease, age <5 years, Probable"],
    ],
    vaccineRelevance:
      "PCV15/PCV20-preventable. Series at 2, 4, 6, 12-15 mo.",
    suggestedProviderAction:
      "Confirm PCV series; review post-splenectomy and high-risk indications.",
  },
];

function classifyStatus(
  ytd: number,
  priorYtd: number,
): { status: VpdStatus; rationale: string } {
  if (ytd === 0) {
    return {
      status: "No cases reported",
      rationale:
        "No cases are present in the current provisional Texas year-to-date total.",
    };
  }

  if (ytd > priorYtd) {
    return {
      status: "Above prior-year pace",
      rationale: `${ytd} provisional Texas cases YTD vs ${priorYtd} in the same period last year. This comparison is not an outbreak determination.`,
    };
  }

  return {
    status: "Reported cases",
    rationale: `${ytd} provisional Texas cases YTD vs ${priorYtd} in the same period last year. An official advisory is required to label an outbreak.`,
  };
}

function count(v: unknown): number | undefined {
  if (v == null || v === "" || v === "-") return 0;
  if (
    typeof v === "string" &&
    ["U", "N", "NN", "NA"].includes(v.trim().toUpperCase())
  ) {
    return undefined;
  }
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

interface DiseaseTotals {
  week: number;
  ytd: number;
  priorYtd: number;
}

function latestCommonTotals(
  spec: DiseaseSpec,
  byLabel: Map<string, NndssRow[]>,
): DiseaseTotals | undefined {
  const usableByComponent = spec.labelGroups.map((alternatives) => {
    const candidates = alternatives
      .map((label) => {
        const rows = byLabel.get(label) ?? [];
        return new Map(
          rows.flatMap((row) => {
            const week = Number(row.week);
            const ytd = count(row.m3);
            const priorYtd = count(row.m4);
            return Number.isFinite(week) &&
              week > 0 &&
              ytd !== undefined &&
              priorYtd !== undefined
              ? [[week, { ytd, priorYtd }] as const]
              : [];
          }),
        );
      })
      .filter((rows) => rows.size > 0)
      .sort(
        (a, b) =>
          Math.max(...b.keys()) - Math.max(...a.keys()),
      );
    return candidates[0];
  });
  if (usableByComponent.some((rows) => rows === undefined)) return undefined;
  const components = usableByComponent as Array<
    Map<number, { ytd: number; priorYtd: number }>
  >;

  const commonWeeks = [...components[0].keys()].filter((week) =>
    components.every((rows) => rows.has(week)),
  );
  const week = commonWeeks.length > 0 ? Math.max(...commonWeeks) : undefined;
  if (week === undefined) return undefined;

  return components.reduce<DiseaseTotals>(
    (totals, rows) => {
      const value = rows.get(week)!;
      totals.ytd += value.ytd;
      totals.priorYtd += value.priorYtd;
      return totals;
    },
    { week, ytd: 0, priorYtd: 0 },
  );
}

async function fetchTexasNndssRows(): Promise<NndssRow[]> {
  const datasetId = process.env.CDC_NNDSS_DATASET_ID || DEFAULT_DATASET_ID;
  const token = process.env.CDC_APP_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;

  // Build OR clause across all relevant label variants.
  const labels = Array.from(
    new Set(DISEASES.flatMap((d) => d.labelGroups.flat())),
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

  // Index rows by label. Multi-label diseases are summed at their latest
  // common usable week so revisions and component counts remain aligned.
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
    const totals = latestCommonTotals(spec, byLabel);
    const classification = totals
      ? classifyStatus(totals.ytd, totals.priorYtd)
      : {
          status: "Unknown" as VpdStatus,
          rationale:
            "A current comparable cumulative value was not available for every required NNDSS component.",
        };

    items.push({
      diseaseName: spec.diseaseName,
      status: classification.status,
      recentCases: totals?.ytd,
      priorYearCases: totals?.priorYtd,
      geography: `Texas (state-level, YTD through MMWR week ${totals?.week ?? "unavailable"})`,
      vaccineRelevance: spec.vaccineRelevance,
      suggestedProviderAction: spec.suggestedProviderAction,
      thresholdRationale: classification.rationale,
      lastUpdated: todayIso(),
    });
  }

  const fetchedAt = todayIso();
  return {
    source: "CDC NNDSS Weekly Data (Texas)",
    sourceUrl: "https://data.cdc.gov/d/x9gk-5huc",
    geography: "Texas",
    reportingDate: `${new Date().getUTCFullYear()} MMWR week ${latestWeek || "unknown"}`,
    fetchedAt,
    metric: "Provisional year-to-date reported cases",
    lastUpdated: fetchedAt,
    items,
  };
}
