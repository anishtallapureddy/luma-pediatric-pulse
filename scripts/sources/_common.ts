import type { SignalLevel } from "../../src/types/health-watch";

export const MCKINNEY_PRIMARY_ZIP = "75071";
export const MCKINNEY_LAT = 33.2;
export const MCKINNEY_LNG = -96.6347;

export const COVERAGE_ZIPS = [
  "75071",
  "75069",
  "75070",
  "75072",
  "75454",
  "75409",
  "75495",
  "75078",
  "75035",
  "75009",
];

export function aqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function todayIso(): string {
  return new Date().toISOString();
}

export function pollenIndexToLevel(index: number): SignalLevel {
  // Google Pollen UPI is 0-5
  if (index <= 1) return "Low";
  if (index <= 2) return "Moderate";
  if (index <= 3) return "High";
  if (index >= 4) return "Very High";
  return "Unknown";
}

async function fetchWithRetry(
  url: string,
  init: RequestInit | undefined,
  attempts = 3,
  timeoutMs = 20_000,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const headers = {
        "User-Agent": "luma-pediatric-pulse/1.0 (+https://pulse.lumapediatrics.com)",
        ...(init?.headers || {}),
      };
      const res = await fetch(url, { ...init, headers, signal: ctrl.signal });
      clearTimeout(timer);
      // Retry on 5xx and 429; pass 4xx through.
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`HTTP ${res.status} from ${url}`);
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
          continue;
        }
        return res;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetchWithRetry(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} from ${url}: ${body.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetchWithRetry(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.text();
}
