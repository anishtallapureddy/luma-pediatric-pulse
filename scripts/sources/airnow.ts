import type { AirQuality } from "../../src/types/health-watch";
import { MCKINNEY_PRIMARY_ZIP, aqiCategory, fetchJson, todayIso } from "./_common";

interface AirNowObservation {
  DateObserved: string;
  ParameterName: string;
  AQI: number;
  Category: { Name: string };
}

interface AirNowForecast {
  DateForecast: string;
  ParameterName: string;
  AQI: number;
  Category: { Name: string };
}

/**
 * Fetches current AQI + 3-day forecast for the North Dallas area from the EPA AirNow API.
 * Free API key from https://docs.airnowapi.org/login (no credit card required).
 *
 * Env: AIRNOW_API_KEY
 */
export async function fetchAirNow(): Promise<AirQuality> {
  const apiKey = process.env.AIRNOW_API_KEY;
  if (!apiKey) throw new Error("AIRNOW_API_KEY not set");

  const zip = MCKINNEY_PRIMARY_ZIP;

  const obsUrl =
    `https://www.airnowapi.org/aq/observation/zipCode/current/` +
    `?format=application/json&zipCode=${zip}&distance=100&API_KEY=${apiKey}`;

  const fcstUrl =
    `https://www.airnowapi.org/aq/forecast/zipCode/` +
    `?format=application/json&zipCode=${zip}&distance=100&API_KEY=${apiKey}`;

  const [obs, fcst] = await Promise.all([
    fetchJson<AirNowObservation[]>(obsUrl),
    fetchJson<AirNowForecast[]>(fcstUrl),
  ]);

  // Pick the dominant observation (highest AQI across reported parameters).
  const top =
    obs.slice().sort((a, b) => (b.AQI ?? 0) - (a.AQI ?? 0))[0] ?? null;
  const currentAqi = top?.AQI ?? 0;
  const primaryPollutant = top?.ParameterName ?? "Unknown";
  const category = top?.Category?.Name ?? aqiCategory(currentAqi);

  // Forecast: take the highest AQI per date (worst-case across pollutants), next 3 days.
  const byDate = new Map<string, AirNowForecast>();
  for (const f of fcst) {
    const prev = byDate.get(f.DateForecast);
    if (!prev || (f.AQI ?? 0) > (prev.AQI ?? 0)) byDate.set(f.DateForecast, f);
  }
  const forecast = Array.from(byDate.values())
    .sort((a, b) => a.DateForecast.localeCompare(b.DateForecast))
    .slice(0, 3)
    .map((f) => ({
      date: f.DateForecast,
      aqi: (f.AQI ?? 0) < 0 ? 0 : (f.AQI ?? 0),
      category: f.Category?.Name ?? aqiCategory(f.AQI ?? 0),
    }));

  const providerNote =
    currentAqi > 100
      ? "Air quality is degraded. Reinforce asthma action plan use and outdoor-activity guidance for sensitive patients."
      : currentAqi > 50
        ? "Air quality is in the Moderate range. Sensitive patients may notice mild symptoms."
        : "Air quality is in the Good range. No additional asthma precautions indicated beyond routine asthma action plan use.";

  return {
    currentAqi,
    category,
    primaryPollutant,
    forecast,
    providerNote,
    source: "EPA AirNow",
    lastUpdated: todayIso(),
  };
}
