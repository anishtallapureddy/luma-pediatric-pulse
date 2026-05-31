import type {
  DrugShortage,
  DrugShortagesSection,
  DrugShortageStatus,
} from "../../src/types/health-watch";
import { fetchJson, todayIso } from "./_common";

interface OpenFdaShortageResult {
  generic_name?: string;
  proprietary_name?: string;
  status?: string;
  therapeutic_category?: string[] | string;
  update_date?: string;
  shortage_reason?: string;
}

interface OpenFdaShortageResponse {
  results?: OpenFdaShortageResult[];
  error?: { code: string; message: string };
}

interface WatchlistEntry {
  drugName: string;
  searchTerm: string;
  category: string;
  pediatricRelevance: string;
  suggestedProviderAction: string;
}

const WATCHLIST: WatchlistEntry[] = [
  {
    drugName: "Amoxicillin (suspension)",
    searchTerm: "amoxicillin",
    category: "Antibiotic",
    pediatricRelevance:
      "First-line for AOM, strep pharyngitis, CAP in many pediatric patients.",
    suggestedProviderAction:
      "Confirm pharmacy availability before prescribing high-volume liquid formulations; consider alternative concentrations.",
  },
  {
    drugName: "Amoxicillin-clavulanate (suspension)",
    searchTerm: "amoxicillin and clavulanate",
    category: "Antibiotic",
    pediatricRelevance:
      "Common second-line for AOM and sinusitis when amoxicillin is insufficient.",
    suggestedProviderAction:
      "Verify availability with local pharmacy before sending; have alternate regimens ready.",
  },
  {
    drugName: "Cefdinir (suspension)",
    searchTerm: "cefdinir",
    category: "Antibiotic",
    pediatricRelevance:
      "Common penicillin alternative for AOM and sinusitis.",
    suggestedProviderAction:
      "Monitor for changes if amoxicillin demand surges.",
  },
  {
    drugName: "Albuterol HFA inhaler",
    searchTerm: "albuterol",
    category: "Bronchodilator",
    pediatricRelevance:
      "Core rescue therapy for pediatric asthma and reactive airway disease.",
    suggestedProviderAction:
      "Reinforce spacer use and asthma action plans; remind families to refill before respiratory season peaks.",
  },
  {
    drugName: "Albuterol nebulizer solution",
    searchTerm: "albuterol sulfate inhalation solution",
    category: "Bronchodilator",
    pediatricRelevance:
      "Used for in-clinic nebulizer treatments and home neb therapy in younger children.",
    suggestedProviderAction:
      "Track on-hand clinic stock; prefer MDI + spacer when clinically appropriate.",
  },
  {
    drugName: "Oseltamivir (suspension)",
    searchTerm: "oseltamivir",
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

function classifyStatus(rawStatus?: string): DrugShortageStatus {
  if (!rawStatus) return "Available";
  const s = rawStatus.toLowerCase();
  if (s.includes("resolved")) return "Resolved";
  if (s.includes("currently in shortage") || s === "current") return "Shortage";
  if (s.includes("available") || s.includes("no longer")) return "Available";
  if (s.includes("supply")) return "Limited";
  return "Limited";
}

async function lookup(term: string): Promise<OpenFdaShortageResult | null> {
  // openFDA: drug shortages endpoint, search generic_name
  const url =
    `https://api.fda.gov/drug/drugshortages.json` +
    `?search=generic_name:"${encodeURIComponent(term)}"` +
    `&limit=1`;
  try {
    const resp = await fetchJson<OpenFdaShortageResponse>(url);
    if (resp.error) return null;
    return resp.results?.[0] ?? null;
  } catch {
    // openFDA returns 404 when nothing matches — that means "available" (no active shortage record).
    return null;
  }
}

/**
 * Builds the pediatric drug shortage watchlist by querying openFDA for each
 * tracked drug. openFDA is free and requires no API key.
 *
 * Drugs with no openFDA record are treated as "Available" (no active shortage).
 */
export async function fetchDrugShortages(): Promise<DrugShortagesSection> {
  const items: DrugShortage[] = [];

  for (const entry of WATCHLIST) {
    const hit = await lookup(entry.searchTerm);
    const status: DrugShortageStatus = hit ? classifyStatus(hit.status) : "Available";

    items.push({
      drugName: entry.drugName,
      category: entry.category,
      status,
      pediatricRelevance: entry.pediatricRelevance,
      suggestedProviderAction: entry.suggestedProviderAction,
      lastUpdated: hit?.update_date ?? todayIso(),
      source: "FDA Drug Shortages",
    });
  }

  return {
    source: "FDA Drug Shortages / openFDA",
    lastUpdated: todayIso(),
    items,
  };
}
