import type { ProviderHealthWatchData } from "@/types/health-watch";
import { mockProviderHealthWatchData } from "./mock-data";
import snapshot from "../../../data/snapshot.json";

/**
 * Loads the most recent committed snapshot from `data/snapshot.json`.
 *
 * The snapshot is regenerated daily by `scripts/refresh-snapshot.ts` (run via
 * GitHub Actions). If the file is missing or malformed, we fall back to the
 * mock dataset so local dev still works.
 *
 * Static export: this runs at build time, so the page is fully prerendered with
 * the latest snapshot baked in. A new snapshot commit triggers a redeploy.
 */
export function loadSnapshot(): ProviderHealthWatchData {
  try {
    return snapshot as unknown as ProviderHealthWatchData;
  } catch {
    return mockProviderHealthWatchData;
  }
}
