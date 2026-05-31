import type { CommunityVirusWatch } from "../../src/types/health-watch";
import { mockProviderHealthWatchData } from "../../src/lib/health-watch/mock-data";
import { todayIso } from "./_common";

/**
 * Community virus watch.
 *
 * Long-term source plan: CDC NREVSS public API (HHS Region 6 weekly aggregate
 * positivity for respiratory viruses) + CDC NoroSTAT (norovirus regional
 * activity) + Texas DSHS HFMD/parvo B19 surveillance bulletins.
 *
 * For now we passthrough the curated baseline from mock-data so the snapshot
 * always contains the full virus list. Once individual upstream endpoints are
 * wired, the per-entry levels/trends can be overwritten in this function.
 */
export async function fetchCommunityVirusWatch(): Promise<CommunityVirusWatch> {
  const baseline = mockProviderHealthWatchData.communityVirusWatch;
  if (!baseline) {
    throw new Error("communityVirusWatch baseline missing from mock data");
  }
  return {
    ...baseline,
    lastUpdated: todayIso(),
    stale: false,
    staleSince: undefined,
    error: undefined,
  };
}
