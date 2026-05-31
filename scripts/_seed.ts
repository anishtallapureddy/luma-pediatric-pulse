import { mockProviderHealthWatchData } from "../src/lib/health-watch/mock-data";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/snapshot.json",
  JSON.stringify(mockProviderHealthWatchData, null, 2),
);
console.log("seeded data/snapshot.json");
