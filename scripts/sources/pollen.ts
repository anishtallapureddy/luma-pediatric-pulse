import type { Pollen, SignalLevel } from "../../src/types/health-watch";
import {
  MCKINNEY_LAT,
  MCKINNEY_LNG,
  fetchJson,
  pollenIndexToLevel,
  todayIso,
} from "./_common";

interface PollenTypeInfo {
  code: string;
  displayName: string;
  inSeason?: boolean;
  indexInfo?: { value?: number; category?: string };
}

interface PlantInfo {
  code: string;
  displayName: string;
  indexInfo?: { value?: number; category?: string };
  plantDescription?: { type?: string };
}

interface PollenDailyInfo {
  date: { year: number; month: number; day: number };
  pollenTypeInfo: PollenTypeInfo[];
  plantInfo: PlantInfo[];
}

interface PollenForecastResponse {
  regionCode?: string;
  dailyInfo: PollenDailyInfo[];
}

function ymd(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function findTypeIndex(day: PollenDailyInfo, code: string): number {
  const t = day.pollenTypeInfo.find((p) => p.code.toUpperCase() === code);
  return t?.indexInfo?.value ?? 0;
}

function maxLevel(levels: SignalLevel[]): SignalLevel {
  const order: Record<SignalLevel, number> = {
    Unknown: -1,
    Low: 0,
    Moderate: 1,
    High: 2,
    "Very High": 3,
  };
  return levels.reduce(
    (acc, l) => (order[l] > order[acc] ? l : acc),
    "Unknown" as SignalLevel,
  );
}

/**
 * Fetches a 5-day pollen forecast from the Google Pollen API.
 * Free up to 10,000 calls/month. Requires a GCP project with Pollen API enabled.
 *
 * Env: GOOGLE_POLLEN_API_KEY
 * Docs: https://developers.google.com/maps/documentation/pollen
 */
export async function fetchPollen(): Promise<Pollen> {
  const apiKey = process.env.GOOGLE_POLLEN_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_POLLEN_API_KEY not set");

  const url =
    `https://pollen.googleapis.com/v1/forecast:lookup` +
    `?key=${apiKey}&location.latitude=${MCKINNEY_LAT}` +
    `&location.longitude=${MCKINNEY_LNG}&days=5&plantsDescription=true`;

  const resp = await fetchJson<PollenForecastResponse>(url);
  const days = resp.dailyInfo ?? [];

  const forecast = days.map((d) => ({
    date: ymd(d.date),
    tree: findTypeIndex(d, "TREE"),
    grass: findTypeIndex(d, "GRASS"),
    weed: findTypeIndex(d, "WEED"),
  }));

  // Levels: use today (first day) for current levels.
  const today = days[0];
  const treeLevel: SignalLevel = today
    ? pollenIndexToLevel(findTypeIndex(today, "TREE"))
    : "Unknown";
  const grassLevel: SignalLevel = today
    ? pollenIndexToLevel(findTypeIndex(today, "GRASS"))
    : "Unknown";
  const weedLevel: SignalLevel = today
    ? pollenIndexToLevel(findTypeIndex(today, "WEED"))
    : "Unknown";

  // Dominant allergens: top 3 in-season tree/weed/grass plants by index.
  const dominantAllergens = today
    ? today.plantInfo
        .filter((p) => (p.indexInfo?.value ?? 0) >= 2)
        .sort(
          (a, b) => (b.indexInfo?.value ?? 0) - (a.indexInfo?.value ?? 0),
        )
        .slice(0, 3)
        .map((p) => p.displayName)
    : [];

  const overall = maxLevel([treeLevel, grassLevel, weedLevel]);
  const providerNote =
    overall === "Very High" || overall === "High"
      ? `Pollen is ${overall.toLowerCase()} (${dominantAllergens.join(", ") || "mixed pollens"} prominent). Expect more allergy-symptom and wheezing-related calls.`
      : overall === "Moderate"
        ? "Pollen activity is moderate. Routine allergy guidance for sensitive families."
        : "Pollen activity is low. No additional allergy planning indicated.";

  return {
    treeLevel,
    grassLevel,
    weedLevel,
    dominantAllergens,
    forecast,
    providerNote,
    source: "Google Pollen API",
    lastUpdated: todayIso(),
  };
}
