import type { AirQuality } from "../../src/types/health-watch";
import { MCKINNEY_PRIMARY_ZIP, aqiCategory, fetchJson, todayIso } from "./_common";

interface AirNowObservation {
  dateObserved?: string;
  parameterName?: string;
  nowcastAQI?: number;
  aqiCategoryName?: string;
  reportingAreaName?: string;
  siteName?: string;
}

interface AirNowForecast {
  dateValid?: string;
  parameterName?: string;
  aqi?: number | null;
  categoryNumber?: number;
  categoryName?: string;
  reportingArea?: string;
}

/**
 * Fetches current AQI and forecast data from AirNow's 2026 replacement APIs.
 * Free API key from https://docs.airnowapi.org/login (no credit card required).
 *
 * Env: AIRNOW_API_KEY
 */
export async function fetchAirNow(): Promise<AirQuality> {
  const apiKey = process.env.AIRNOW_API_KEY;
  if (!apiKey) throw new Error("AIRNOW_API_KEY not set");

  const zip = MCKINNEY_PRIMARY_ZIP;

  const obsUrl =
    `https://www.airnowapi.org/aq/observation/current/ziplatlong/` +
    `?format=application/json&zipCode=${zip}&API_KEY=${apiKey}`;

  const fcstUrl =
    `https://www.airnowapi.org/aq/forecast/current/` +
    `?format=application/json&zipCode=${zip}&API_KEY=${apiKey}`;

  const [obs, fcst] = await Promise.all([
    fetchJson<AirNowObservation[]>(obsUrl),
    fetchJson<AirNowForecast[]>(fcstUrl).catch((err) => {
      console.warn(`[airnow] forecast unavailable, continuing with observation only: ${(err as Error).message}`);
      return [] as AirNowForecast[];
    }),
  ]);

  const validObservations = obs.filter(
    (item) =>
      typeof item.nowcastAQI === "number" &&
      Number.isFinite(item.nowcastAQI) &&
      item.nowcastAQI >= 0,
  );
  if (validObservations.length === 0) {
    throw new Error("AirNow returned no observation with a valid nowcast AQI");
  }

  const top = validObservations.sort(
    (a, b) => (b.nowcastAQI ?? -1) - (a.nowcastAQI ?? -1),
  )[0];
  const currentAqi = top.nowcastAQI!;
  const primaryPollutant =
    top.parameterName === "OZONE"
      ? "Ozone"
      : (top.parameterName ?? "Unknown");
  const category = top.aqiCategoryName ?? aqiCategory(currentAqi);

  // Keep the highest numeric AQI per day. AirNow may publish category-only
  // forecasts, so those remain valid without being converted to a false zero.
  const categoryRank = (forecast: AirNowForecast): number => {
    if (
      typeof forecast.categoryNumber === "number" &&
      Number.isFinite(forecast.categoryNumber)
    ) {
      return forecast.categoryNumber;
    }
    const categoryRanks: Record<string, number> = {
      Good: 1,
      Moderate: 2,
      "Unhealthy for Sensitive Groups": 3,
      Unhealthy: 4,
      "Very Unhealthy": 5,
      Hazardous: 6,
    };
    if (forecast.categoryName && categoryRanks[forecast.categoryName]) {
      return categoryRanks[forecast.categoryName];
    }
    if (typeof forecast.aqi === "number" && forecast.aqi >= 0) {
      if (forecast.aqi <= 50) return 1;
      if (forecast.aqi <= 100) return 2;
      if (forecast.aqi <= 150) return 3;
      if (forecast.aqi <= 200) return 4;
      if (forecast.aqi <= 300) return 5;
      return 6;
    }
    return 0;
  };
  const byDate = new Map<string, AirNowForecast>();
  for (const f of fcst) {
    if (!f.dateValid) continue;
    const prev = byDate.get(f.dateValid);
    const nextAqi =
      typeof f.aqi === "number" && Number.isFinite(f.aqi) && f.aqi >= 0
        ? f.aqi
        : undefined;
    const prevAqi =
      typeof prev?.aqi === "number" &&
      Number.isFinite(prev.aqi) &&
      prev.aqi >= 0
        ? prev.aqi
        : undefined;
    const nextRank = categoryRank(f);
    const prevRank = prev ? categoryRank(prev) : -1;
    if (
      !prev ||
      nextRank > prevRank ||
      (nextRank === prevRank &&
        nextAqi !== undefined &&
        (prevAqi === undefined || nextAqi > prevAqi))
    ) {
      byDate.set(f.dateValid, f);
    }
  }
  const forecast = Array.from(byDate.values())
    .sort((a, b) => a.dateValid!.localeCompare(b.dateValid!))
    .slice(0, 3)
    .map((f) => ({
      date: f.dateValid!,
      aqi:
        typeof f.aqi === "number" && Number.isFinite(f.aqi) && f.aqi >= 0
          ? f.aqi
          : undefined,
      category:
        f.categoryName ??
        (typeof f.aqi === "number" && f.aqi >= 0
          ? aqiCategory(f.aqi)
          : "Forecast available"),
    }));

  const providerNote =
    currentAqi > 100
      ? "Air quality is degraded. Reinforce asthma action plan use and outdoor-activity guidance for sensitive patients."
      : currentAqi > 50
        ? "Air quality is in the Moderate range. Sensitive patients may notice mild symptoms."
        : "Air quality is in the Good range. No additional asthma precautions indicated beyond routine asthma action plan use.";

  const fetchedAt = todayIso();
  const geography =
    top.reportingAreaName ??
    fcst.find((item) => item.reportingArea)?.reportingArea ??
    `AirNow reporting area returned for ZIP ${zip}`;

  return {
    currentAqi,
    category,
    primaryPollutant,
    forecast,
    providerNote,
    source: "EPA AirNow",
    sourceUrl: "https://www.airnow.gov/",
    geography,
    reportingDate: top.dateObserved,
    fetchedAt,
    metric: "Air Quality Index (AQI), preliminary AirNow observation",
    lastUpdated: fetchedAt,
  };
}
