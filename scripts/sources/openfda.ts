import type {
  DrugShortage,
  DrugShortagesSection,
  DrugShortageStatus,
} from "../../src/types/health-watch";
import { fetchJson, todayIso } from "./_common";

interface OpenFdaShortageResult {
  generic_name?: string;
  status?: string;
  availability?: string;
  company_name?: string;
  dosage_form?: string;
  presentation?: string;
  therapeutic_category?: string[] | string;
  update_date?: string;
  shortage_reason?: string;
}

interface OpenFdaShortageResponse {
  meta?: {
    last_updated?: string;
    results?: { total?: number };
  };
  results?: OpenFdaShortageResult[];
  error?: { code: string; message: string };
}

interface WatchlistEntry {
  drugName: string;
  searchTerm: string;
  presentationIncludes?: string[];
  category: string;
  pediatricRelevance: string;
  suggestedProviderAction: string;
}

const WATCHLIST: WatchlistEntry[] = [
  {
    drugName: "Amoxicillin (suspension)",
    searchTerm: "amoxicillin",
    presentationIncludes: ["suspension"],
    category: "Antibiotic",
    pediatricRelevance:
      "First-line for AOM, strep pharyngitis, CAP in many pediatric patients.",
    suggestedProviderAction:
      "Confirm pharmacy availability before prescribing high-volume liquid formulations; consider alternative concentrations.",
  },
  {
    drugName: "Amoxicillin-clavulanate (suspension)",
    searchTerm: "clavulanate",
    presentationIncludes: ["suspension"],
    category: "Antibiotic",
    pediatricRelevance:
      "Common second-line for AOM and sinusitis when amoxicillin is insufficient.",
    suggestedProviderAction:
      "Verify availability with local pharmacy before sending; have alternate regimens ready.",
  },
  {
    drugName: "Cefdinir (suspension)",
    searchTerm: "cefdinir",
    presentationIncludes: ["suspension"],
    category: "Antibiotic",
    pediatricRelevance:
      "Common penicillin alternative for AOM and sinusitis.",
    suggestedProviderAction:
      "Monitor for changes if amoxicillin demand surges.",
  },
  {
    drugName: "Albuterol HFA inhaler",
    searchTerm: "albuterol",
    presentationIncludes: ["aerosol", "inhaler"],
    category: "Bronchodilator",
    pediatricRelevance:
      "Core rescue therapy for pediatric asthma and reactive airway disease.",
    suggestedProviderAction:
      "Reinforce spacer use and asthma action plans; remind families to refill before respiratory season peaks.",
  },
  {
    drugName: "Albuterol nebulizer solution",
    searchTerm: "albuterol",
    presentationIncludes: ["solution"],
    category: "Bronchodilator",
    pediatricRelevance:
      "Used for in-clinic nebulizer treatments and home neb therapy in younger children.",
    suggestedProviderAction:
      "Track on-hand clinic stock; prefer MDI + spacer when clinically appropriate.",
  },
  {
    drugName: "Oseltamivir (suspension)",
    searchTerm: "oseltamivir",
    presentationIncludes: ["suspension"],
    category: "Antiviral",
    pediatricRelevance:
      "Influenza treatment in eligible pediatric patients during flu season.",
    suggestedProviderAction:
      "Revisit if regional flu activity rises.",
  },
  {
    drugName: "Methylphenidate",
    searchTerm: "methylphenidate",
    category: "ADHD stimulant",
    pediatricRelevance:
      "Common ADHD therapy; shortages affect refill workflows and family planning.",
    suggestedProviderAction:
      "Discuss formulation alternatives with family; coordinate with pharmacy before changing dose or product.",
  },
  {
    drugName: "Amphetamine / dextroamphetamine",
    searchTerm: "amphetamine",
    category: "ADHD stimulant",
    pediatricRelevance:
      "Alternate ADHD therapy; shortages affect refill and switching options.",
    suggestedProviderAction:
      "Plan refill timing carefully; consider documented alternative regimens per family.",
  },
];

function classifyStatus(rows: OpenFdaShortageResult[]): DrugShortageStatus {
  if (rows.length === 0) return "Unknown";
  const current = rows.filter(
    (row) => row.status?.toLowerCase() === "current",
  );
  if (current.length === 0) return "Resolved";
  const availability = current.map((row) =>
    (row.availability ?? "").toLowerCase(),
  );
  if (availability.some((value) => value.includes("unavailable"))) {
    return "Shortage";
  }
  if (availability.some((value) => value.includes("limited"))) {
    return "Limited";
  }
  // A drug can remain on FDA's current shortage list while some presentations
  // are available. "Limited" is safer than claiming broad availability.
  return "Limited";
}

async function lookup(
  term: string,
): Promise<{ rows: OpenFdaShortageResult[]; sourceDate?: string }> {
  const params = new URLSearchParams({
    search: `generic_name:${term}`,
    limit: "100",
  });
  const url = `https://api.fda.gov/drug/shortages.json?${params.toString()}`;
  try {
    const resp = await fetchJson<OpenFdaShortageResponse>(url);
    if (resp.error) {
      throw new Error(`openFDA error ${resp.error.code}: ${resp.error.message}`);
    }
    return {
      rows: resp.results ?? [],
      sourceDate: resp.meta?.last_updated,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("HTTP 404 ")) {
      return { rows: [] };
    }
    throw new Error(`openFDA lookup failed for ${term}`, { cause: error });
  }
}

/**
 * Builds the pediatric drug shortage watchlist by querying openFDA for each
 * tracked drug. openFDA is free and requires no API key.
 *
 * A missing record is reported as Unknown rather than interpreted as available.
 */
export async function fetchDrugShortages(): Promise<DrugShortagesSection> {
  const items: DrugShortage[] = [];
  const sourceDates: string[] = [];

  for (const entry of WATCHLIST) {
    const result = await lookup(entry.searchTerm);
    const rows = entry.presentationIncludes
      ? result.rows.filter((row) => {
          const description =
            `${row.presentation ?? ""} ${row.dosage_form ?? ""}`.toLowerCase();
          return entry.presentationIncludes!.some((term) =>
            description.includes(term),
          );
        })
      : result.rows;
    const { sourceDate } = result;
    if (sourceDate) sourceDates.push(sourceDate);
    const status = classifyStatus(rows);
    const currentRows = rows.filter(
      (row) => row.status?.toLowerCase() === "current",
    );
    const updateDates = rows
      .map((row) => row.update_date)
      .filter((value): value is string => Boolean(value))
      .sort();
    const unavailableCount = currentRows.filter((row) =>
      (row.availability ?? "").toLowerCase().includes("unavailable"),
    ).length;
    const limitedCount = currentRows.filter((row) =>
      (row.availability ?? "").toLowerCase().includes("limited"),
    ).length;
    const statusDetail =
      rows.length === 0
        ? "Not listed in FDA's current or resolved shortage records; this does not confirm local availability."
        : currentRows.length === 0
          ? "FDA records found, with no current shortage entries."
          : `${currentRows.length} current FDA presentation record(s); ${unavailableCount} unavailable and ${limitedCount} limited. Local pharmacy supply may differ.`;

    items.push({
      drugName: entry.drugName,
      category: entry.category,
      status,
      pediatricRelevance: entry.pediatricRelevance,
      suggestedProviderAction: entry.suggestedProviderAction,
      lastUpdated:
        updateDates[updateDates.length - 1] ?? sourceDate ?? todayIso(),
      source: "FDA Drug Shortages",
      statusDetail,
    });
  }

  const fetchedAt = todayIso();
  const reportingDate = sourceDates.sort().slice(-1)[0];
  return {
    source: "FDA Drug Shortages / openFDA",
    sourceUrl: "https://open.fda.gov/apis/drug/drugshortages/",
    geography: "United States",
    reportingDate,
    fetchedAt,
    metric: "FDA product and presentation shortage status; not local inventory",
    lastUpdated: fetchedAt,
    items,
  };
}
