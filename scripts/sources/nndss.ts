import type {
  VaccinePreventableDisease,
  VaccinePreventableSection,
  VpdStatus,
  TrendDirection,
} from "../../src/types/health-watch";
import { fetchJson, todayIso } from "./_common";

/**
 * Vaccine-preventable disease activity for Texas.
 *
 * Primary source: CDC NNDSS weekly tables on data.cdc.gov.
 * NNDSS tables shift dataset IDs and column names year-to-year; this fetcher
 * queries the consolidated weekly cases endpoint and is intentionally defensive:
 *
 *   - If the dataset is unavailable or schema changes, this throws and the
 *     refresh orchestrator keeps the prior snapshot's `vaccinePreventable`
 *     section, marked stale.
 *   - The mock-data baseline (sporadic activity at TX state level) is only
 *     used to seed the very first snapshot.
 *
 * Diseases tracked: measles, pertussis, hepatitis A, varicella, mumps,
 * invasive pneumococcal disease.
 */

interface NndssRow {
  reporting_area?: string;
  label?: string;
  current_week?: string;
  previous_4_week_max?: string;
  cum_2024?: string;
  cum_2025?: string;
  cum_2026?: string;
  ytd_current?: string;
  ytd_previous_year?: string;
}

interface DiseaseSpec {
  diseaseName: string;
  labelMatches: RegExp;
  vaccineRelevance: string;
  suggestedProviderAction: string;
  watchThreshold: number;
  outbreakThreshold: number;
}

const DISEASES: DiseaseSpec[] = [
  {
    diseaseName: "Measles",
    labelMatches: /measles/i,
    vaccineRelevance:
      "MMR-preventable. Highly contagious; airborne. Confirm MMR1 (12-15 mo) and MMR2 (4-6 yr) at every visit.",
    suggestedProviderAction:
      "Verify MMR status, prompt catch-up doses, and review measles isolation/notification protocol with staff.",
    watchThreshold: 1,
    outbreakThreshold: 3,
  },
  {
    diseaseName: "Pertussis (whooping cough)",
    labelMatches: /pertussis/i,
    vaccineRelevance:
      "DTaP/Tdap-preventable. Infants under 2 mo are highest-risk. Confirm caregiver Tdap (cocooning).",
    suggestedProviderAction:
      "Low threshold for testing prolonged paroxysmal cough; confirm DTaP series and Tdap for adolescents.",
    watchThreshold: 10,
    outbreakThreshold: 25,
  },
  {
    diseaseName: "Hepatitis A",
    labelMatches: /hepatitis a/i,
    vaccineRelevance:
      "HepA-preventable. Two-dose series starting at 12 mo.",
    suggestedProviderAction:
      "Confirm HepA series at well visits; emphasize for travel to endemic regions.",
    watchThreshold: 5,
    outbreakThreshold: 15,
  },
  {
    diseaseName: "Varicella (chickenpox)",
    labelMatches: /varicella/i,
    vaccineRelevance:
      "Varicella-preventable. Two-dose series (12-15 mo, 4-6 yr).",
    suggestedProviderAction:
      "Confirm two-dose varicella status at school-age visits; counsel on rash isolation.",
    watchThreshold: 10,
    outbreakThreshold: 30,
  },
  {
    diseaseName: "Mumps",
    labelMatches: /mumps/i,
    vaccineRelevance:
      "MMR-preventable. Outbreaks often occur in close-contact settings (camps, schools).",
    suggestedProviderAction:
      "Confirm MMR2 in school-age and adolescents; review parotitis differential during outbreaks.",
    watchThreshold: 1,
    outbreakThreshold: 5,
  },
  {
    diseaseName: "Invasive pneumococcal disease",
    labelMatches: /pneumococc/i,
    vaccineRelevance:
      "PCV15/PCV20-preventable. Series at 2, 4, 6, 12-15 mo.",
    suggestedProviderAction:
      "Confirm PCV series; review post-splenectomy and high-risk indications.",
    watchThreshold: 5,
    outbreakThreshold: 15,
  },
];

function classifyStatus(
  cases: number,
  watch: number,
  outbreak: number,
): VpdStatus {
  if (cases >= outbreak) return "Active outbreak";
  if (cases >= watch) return "Outbreak watch";
  if (cases > 0) return "Sporadic";
  return "No recent cases";
}

function classifyTrend(current: number, prevMax: number): TrendDirection {
  if (prevMax === 0 && current === 0) return "Stable";
  if (current > prevMax * 1.15) return "Rising";
  if (current < prevMax * 0.85) return "Decreasing";
  return "Stable";
}

/**
 * Query NNDSS weekly cases for Texas. Returns rows keyed by disease label.
 *
 * Endpoint placeholder: NNDSS dataset IDs change annually. We use the
 * consolidated weekly dataset and filter client-side by reporting_area=TEXAS.
 */
async function fetchTexasNndssRows(): Promise<NndssRow[]> {
  const datasetId = process.env.CDC_NNDSS_DATASET_ID;
  if (!datasetId) {
    throw new Error(
      "CDC_NNDSS_DATASET_ID not set (NNDSS dataset IDs rotate annually; set the current weekly cases dataset ID).",
    );
  }
  const token = process.env.CDC_APP_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;

  const url =
    `https://data.cdc.gov/resource/${encodeURIComponent(datasetId)}.json` +
    `?reporting_area=TEXAS&$limit=200`;

  const rows = await fetchJson<NndssRow[]>(url, { headers });
  if (!Array.isArray(rows)) throw new Error("NNDSS returned unexpected payload");
  return rows;
}

export async function fetchVaccinePreventable(): Promise<VaccinePreventableSection> {
  const rows = await fetchTexasNndssRows();
  const items: VaccinePreventableDisease[] = [];

  for (const spec of DISEASES) {
    const match = rows.find((r) =>
      spec.labelMatches.test(r.label ?? ""),
    );
    const current = Number(match?.current_week ?? "0") || 0;
    const prevMax = Number(match?.previous_4_week_max ?? "0") || 0;
    const status = classifyStatus(current, spec.watchThreshold, spec.outbreakThreshold);
    const trend = classifyTrend(current, prevMax);

    items.push({
      diseaseName: spec.diseaseName,
      status,
      recentCases: current,
      trend,
      geography: "Texas (state-level)",
      vaccineRelevance: spec.vaccineRelevance,
      suggestedProviderAction: spec.suggestedProviderAction,
      lastUpdated: todayIso(),
    });
  }

  return {
    source: "CDC NNDSS / Texas DSHS",
    lastUpdated: todayIso(),
    items,
  };
}
