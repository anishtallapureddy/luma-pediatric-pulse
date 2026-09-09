import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const MANUAL_ENTERIC_PATH = resolve(
  "data/manual/nrevss-enteric.json",
);

export const ENTERIC_SOURCE_URL =
  "https://www.cdc.gov/nrevss/php/dashboard/index.html";
export const ENTERIC_GEOGRAPHY = "Southern U.S. Census Region";
export const ENTERIC_TEST_METHOD = "PCR tests";
export const ENTERIC_METRIC =
  "Centered three-week moving average percent of PCR tests positive";

export type EntericVirus = "Norovirus" | "Rotavirus";

export interface ManualEntericPoint {
  weekEnding: string;
  weeklyTestsReported: number;
  percentPositive: number;
}

export interface ManualEntericSnapshot {
  schemaVersion: 1;
  sourceName: "CDC NREVSS";
  sourceUrl: typeof ENTERIC_SOURCE_URL;
  geography: typeof ENTERIC_GEOGRAPHY;
  testMethod: typeof ENTERIC_TEST_METHOD;
  metric: string;
  sourceUpdated: string;
  importedAt: string;
  series: Record<EntericVirus, ManualEntericPoint[]>;
}

const VIRUSES: EntericVirus[] = ["Norovirus", "Rotavirus"];
const EXPECTED_COLUMNS = [
  "virus",
  "week_ending",
  "weekly_tests_reported",
  "percent_positive",
  "geography",
  "test_method",
  "source_updated",
] as const;

function parseDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${field} is not a valid date`);
  }
  return value;
}

function rejectFutureDate(value: string, field: string): void {
  const timestamp = new Date(`${value}T00:00:00.000Z`).getTime();
  if (timestamp > Date.now() + 24 * 60 * 60 * 1000) {
    throw new Error(`${field} cannot be in the future`);
  }
}

function parseWeekEnding(value: unknown, row: number): string {
  const weekEnding = parseDate(value, `Row ${row} week_ending`);
  const date = new Date(`${weekEnding}T00:00:00.000Z`);
  if (date.getUTCDay() !== 6) {
    throw new Error(`Row ${row} week_ending must be a Saturday`);
  }
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new Error(`Row ${row} week_ending cannot be in the future`);
  }
  return weekEnding;
}

function parseNumber(
  value: unknown,
  field: string,
  options: { integer?: boolean; min: number; max: number },
): number {
  const parsed =
    (typeof value === "string" && value.trim().length > 0) ||
    typeof value === "number"
      ? Number(value)
      : Number.NaN;
  if (
    !Number.isFinite(parsed) ||
    parsed < options.min ||
    parsed > options.max ||
    (options.integer && !Number.isInteger(parsed))
  ) {
    throw new Error(
      `${field} must be ${options.integer ? "an integer" : "a number"} between ${options.min} and ${options.max}`,
    );
  }
  return parsed;
}

function parseCsvRows(csv: string): string[][] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length === 0) throw new Error("Import CSV is empty");
  return lines.map((line, index) => {
    if (line.includes('"')) {
      throw new Error(
        `Row ${index + 1} contains quotes. Use the controlled template without quoted or comma-containing fields.`,
      );
    }
    return line.split(",").map((value) => value.trim());
  });
}

function validateSeries(
  virus: EntericVirus,
  points: ManualEntericPoint[],
  requireAscending = false,
): ManualEntericPoint[] {
  if (points.length !== 6) {
    throw new Error(`${virus} must have exactly 6 weekly rows`);
  }
  const sorted = points
    .slice()
    .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding));
  if (
    requireAscending &&
    points.some(
      (point, index) => point.weekEnding !== sorted[index]?.weekEnding,
    )
  ) {
    throw new Error(`${virus} JSON series must be in ascending date order`);
  }
  const seen = new Set<string>();
  for (let index = 0; index < sorted.length; index++) {
    const point = sorted[index];
    if (seen.has(point.weekEnding)) {
      throw new Error(`${virus} has a duplicate week ${point.weekEnding}`);
    }
    seen.add(point.weekEnding);
    if (index > 0) {
      const previous = new Date(
        `${sorted[index - 1].weekEnding}T00:00:00.000Z`,
      );
      const current = new Date(`${point.weekEnding}T00:00:00.000Z`);
      const days = (current.getTime() - previous.getTime()) / 86_400_000;
      if (days !== 7) {
        throw new Error(
          `${virus} weeks must be consecutive; ${sorted[index - 1].weekEnding} to ${point.weekEnding} spans ${days} days`,
        );
      }
    }
  }
  return sorted;
}

export function parseManualEntericCsv(
  csv: string,
  importedAt = new Date().toISOString(),
): ManualEntericSnapshot {
  const rows = parseCsvRows(csv);
  const header = rows[0];
  if (
    header.length !== EXPECTED_COLUMNS.length ||
    EXPECTED_COLUMNS.some((column, index) => header[index] !== column)
  ) {
    throw new Error(
      `CSV header must be exactly: ${EXPECTED_COLUMNS.join(",")}`,
    );
  }

  const series: Record<EntericVirus, ManualEntericPoint[]> = {
    Norovirus: [],
    Rotavirus: [],
  };
  const sourceUpdatedValues = new Set<string>();

  for (let index = 1; index < rows.length; index++) {
    const rowNumber = index + 1;
    const row = rows[index];
    if (row.length !== EXPECTED_COLUMNS.length) {
      throw new Error(
        `Row ${rowNumber} must have ${EXPECTED_COLUMNS.length} columns`,
      );
    }
    const [
      virusValue,
      weekEndingValue,
      weeklyTestsReportedValue,
      percentPositiveValue,
      geography,
      testMethod,
      sourceUpdatedValue,
    ] = row;
    if (!VIRUSES.includes(virusValue as EntericVirus)) {
      throw new Error(
        `Row ${rowNumber} virus must be Norovirus or Rotavirus`,
      );
    }
    if (geography !== ENTERIC_GEOGRAPHY) {
      throw new Error(
        `Row ${rowNumber} geography must be "${ENTERIC_GEOGRAPHY}"`,
      );
    }
    if (testMethod !== ENTERIC_TEST_METHOD) {
      throw new Error(
        `Row ${rowNumber} test_method must be "${ENTERIC_TEST_METHOD}"`,
      );
    }

    const virus = virusValue as EntericVirus;
    const weekEnding = parseWeekEnding(weekEndingValue, rowNumber);
    const sourceUpdated = parseDate(
      sourceUpdatedValue,
      `Row ${rowNumber} source_updated`,
    );
    sourceUpdatedValues.add(sourceUpdated);
    series[virus].push({
      weekEnding,
      weeklyTestsReported: parseNumber(
        weeklyTestsReportedValue,
        `Row ${rowNumber} weekly_tests_reported`,
        { integer: true, min: 1, max: 100_000_000 },
      ),
      percentPositive: parseNumber(
        percentPositiveValue,
        `Row ${rowNumber} percent_positive`,
        { min: 0, max: 100 },
      ),
    });
  }

  if (sourceUpdatedValues.size !== 1) {
    throw new Error("All rows must use the same source_updated date");
  }
  const sourceUpdated = [...sourceUpdatedValues][0];
  rejectFutureDate(sourceUpdated, "source_updated");
  const validatedSeries = {
    Norovirus: validateSeries("Norovirus", series.Norovirus),
    Rotavirus: validateSeries("Rotavirus", series.Rotavirus),
  };
  const latestWeeks = VIRUSES.map(
    (virus) => validatedSeries[virus][5].weekEnding,
  );
  if (new Set(latestWeeks).size !== 1) {
    throw new Error(
      "Norovirus and Rotavirus must end on the same reporting week",
    );
  }
  if (sourceUpdated < latestWeeks[0]) {
    throw new Error(
      "source_updated cannot be earlier than the latest reporting week",
    );
  }

  return {
    schemaVersion: 1,
    sourceName: "CDC NREVSS",
    sourceUrl: ENTERIC_SOURCE_URL,
    geography: ENTERIC_GEOGRAPHY,
    testMethod: ENTERIC_TEST_METHOD,
    metric: ENTERIC_METRIC,
    sourceUpdated,
    importedAt,
    series: validatedSeries,
  };
}

function assertManualEntericSnapshot(
  value: unknown,
): asserts value is ManualEntericSnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("Manual NREVSS import must be a JSON object");
  }
  const candidate = value as Partial<ManualEntericSnapshot>;
  if (
    candidate.schemaVersion !== 1 ||
    candidate.sourceName !== "CDC NREVSS" ||
    candidate.sourceUrl !== ENTERIC_SOURCE_URL ||
    candidate.geography !== ENTERIC_GEOGRAPHY ||
    candidate.testMethod !== ENTERIC_TEST_METHOD ||
    candidate.metric !== ENTERIC_METRIC ||
    typeof candidate.sourceUpdated !== "string" ||
    typeof candidate.importedAt !== "string" ||
    !candidate.series
  ) {
    throw new Error("Manual NREVSS import metadata is invalid");
  }
  parseDate(candidate.sourceUpdated, "sourceUpdated");
  rejectFutureDate(candidate.sourceUpdated, "sourceUpdated");
  if (Number.isNaN(new Date(candidate.importedAt).getTime())) {
    throw new Error("importedAt must be a valid ISO timestamp");
  }
  for (const virus of VIRUSES) {
    const points = candidate.series[virus];
    if (!Array.isArray(points)) {
      throw new Error(`${virus} series is missing`);
    }
    validateSeries(
      virus,
      points.map((point, index) => ({
        weekEnding: parseWeekEnding(
          point?.weekEnding,
          index + 1,
        ),
        weeklyTestsReported: parseNumber(
          typeof point?.weeklyTestsReported === "number"
            ? point.weeklyTestsReported
            : Number.NaN,
          `${virus} weeklyTestsReported`,
          { integer: true, min: 1, max: 100_000_000 },
        ),
        percentPositive: parseNumber(
          typeof point?.percentPositive === "number"
            ? point.percentPositive
            : Number.NaN,
          `${virus} percentPositive`,
          { min: 0, max: 100 },
        ),
      })),
      true,
    );
  }
  const latestWeeks = VIRUSES.map(
    (virus) => candidate.series![virus][5].weekEnding,
  );
  if (new Set(latestWeeks).size !== 1) {
    throw new Error(
      "Norovirus and Rotavirus must end on the same reporting week",
    );
  }
  if (candidate.sourceUpdated < latestWeeks[0]) {
    throw new Error(
      "sourceUpdated cannot be earlier than the latest reporting week",
    );
  }
}

export function loadManualEntericSnapshot(
  path = MANUAL_ENTERIC_PATH,
): ManualEntericSnapshot | undefined {
  if (!existsSync(path)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse ${path}`, { cause: error });
  }
  assertManualEntericSnapshot(parsed);
  return parsed;
}
