import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ProviderHealthWatchData,
  SourceMeta,
} from "../src/types/health-watch";
import { mockProviderHealthWatchData } from "../src/lib/health-watch/mock-data";
import { fetchAirNow } from "./sources/airnow";
import { fetchPollen } from "./sources/pollen";
import { fetchCdcRespiratory } from "./sources/cdc";
import { fetchDrugShortages } from "./sources/openfda";
import { fetchVaccinePreventable } from "./sources/nndss";
import { COVERAGE_ZIPS, todayIso } from "./sources/_common";

const SNAPSHOT_PATH = resolve("data/snapshot.json");

function loadExisting(): ProviderHealthWatchData {
  if (!existsSync(SNAPSHOT_PATH)) return mockProviderHealthWatchData;
  try {
    const raw = readFileSync(SNAPSHOT_PATH, "utf8");
    return JSON.parse(raw) as ProviderHealthWatchData;
  } catch (err) {
    console.warn("Could not parse existing snapshot, using mock:", err);
    return mockProviderHealthWatchData;
  }
}

async function tryFetch<T extends SourceMeta>(
  label: string,
  fn: () => Promise<T>,
  previous: T,
): Promise<T> {
  try {
    const fresh = await fn();
    console.log(`[ok] ${label}`);
    return { ...fresh, stale: false, staleSince: undefined, error: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[stale] ${label}: ${msg}`);
    return {
      ...previous,
      stale: true,
      staleSince: previous.staleSince ?? previous.lastUpdated ?? todayIso(),
      error: msg,
    };
  }
}

async function main() {
  const previous = loadExisting();
  // Cold-start safety: if the prior snapshot predates the VPD section, seed
  // from mock-data ONCE so the per-section fallback has something to fall back to.
  const previousVpd =
    previous.vaccinePreventable ?? mockProviderHealthWatchData.vaccinePreventable;

  const [airQuality, pollen, respiratoryIllness, drugShortages, vaccinePreventable] =
    await Promise.all([
      tryFetch("AirNow", fetchAirNow, previous.airQuality),
      tryFetch("Pollen (Google)", fetchPollen, previous.pollen),
      tryFetch("CDC respiratory", fetchCdcRespiratory, previous.respiratoryIllness),
      tryFetch("openFDA drug shortages", fetchDrugShortages, previous.drugShortages),
      tryFetch("CDC NNDSS (VPD)", fetchVaccinePreventable, previousVpd),
    ]);

  const now = todayIso();

  const next: ProviderHealthWatchData = {
    lastUpdated: now,
    lastRefreshedAt: now,
    coverageArea: COVERAGE_ZIPS,
    airQuality,
    pollen,
    respiratoryIllness,
    drugShortages,
    vaccinePreventable,
    operationalRecommendations: previous.operationalRecommendations.length
      ? previous.operationalRecommendations
      : mockProviderHealthWatchData.operationalRecommendations,
    sources: [
      "EPA AirNow (air quality)",
      "Google Pollen API (tree, grass, weed pollen levels)",
      "CDC / Texas DSHS (respiratory illness surveillance)",
      "FDA Drug Shortages / openFDA (medication availability)",
      "CDC NNDSS / Texas DSHS (vaccine-preventable disease surveillance)",
    ],
  };

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`Wrote snapshot to ${SNAPSHOT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal refresh error:", err);
  process.exit(1);
});
