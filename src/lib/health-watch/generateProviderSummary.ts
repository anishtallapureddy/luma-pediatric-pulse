import type {
  ProviderHealthWatchData,
  ProviderSummary,
  RiskLevel,
  SignalLevel,
  TrendDirection,
} from "@/types/health-watch";

const isElevated = (level: SignalLevel): boolean =>
  level === "High" || level === "Very High";

const isRising = (trend: TrendDirection): boolean => trend === "Rising";

export function generateProviderSummary(
  data: ProviderHealthWatchData,
): ProviderSummary {
  const { airQuality, pollen, respiratoryIllness, drugShortages, vaccinePreventable } = data;

  const concerns: string[] = [];
  const moderateConcerns: string[] = [];
  const keySignals: string[] = [];
  const recommendedActions: string[] = [];

  // Pollen
  if (pollen.stale) {
    keySignals.push(
      "The pollen source did not refresh; the dashboard retains its last-known-good forecast.",
    );
  } else if (isElevated(pollen.treeLevel)) {
    concerns.push("pollen");
    keySignals.push(
      `Tree pollen is ${pollen.treeLevel.toLowerCase()} (${pollen.dominantAllergens.join(", ")} dominant).`,
    );
    recommendedActions.push(
      "Keep allergy and asthma guidance ready for cough, congestion, and wheeze-related calls.",
    );
  } else if (pollen.treeLevel === "Moderate" || pollen.grassLevel === "High") {
    moderateConcerns.push("pollen");
    keySignals.push(
      `Pollen activity is notable (tree ${pollen.treeLevel.toLowerCase()}, grass ${pollen.grassLevel.toLowerCase()}).`,
    );
  }

  // Air quality
  if (airQuality.stale) {
    keySignals.push(
      `AirNow did not refresh; AQI ${airQuality.currentAqi} is the last-known-good reading.`,
    );
  } else if (airQuality.currentAqi > 100) {
    concerns.push("air quality");
    keySignals.push(
      `AQI is ${airQuality.currentAqi} (${airQuality.category}); primary pollutant ${airQuality.primaryPollutant}.`,
    );
    recommendedActions.push(
      "Reinforce asthma action plan use and limit outdoor activity messaging for sensitive patients.",
    );
  } else if (airQuality.currentAqi > 50) {
    moderateConcerns.push("air quality");
    keySignals.push(
      `AQI is ${airQuality.currentAqi} (${airQuality.category}).`,
    );
  }

  // Respiratory illness
  const respiratoryRising =
    !respiratoryIllness.stale &&
    ((isElevated(respiratoryIllness.rsvLevel) ||
      isRising(respiratoryIllness.rsvTrend)) ||
    (isElevated(respiratoryIllness.fluLevel) ||
      isRising(respiratoryIllness.fluTrend)) ||
    (isElevated(respiratoryIllness.covidLevel) ||
      isRising(respiratoryIllness.covidTrend)) ||
    isRising(respiratoryIllness.hospitalAdmissionTrend));

  if (respiratoryIllness.stale) {
    keySignals.push(
      "The respiratory hospitalization source did not refresh; retained rates are not treated as current.",
    );
  } else if (respiratoryRising) {
    concerns.push("respiratory illness");
    if (isRising(respiratoryIllness.rsvTrend)) {
      keySignals.push(
        `Regional RSV activity is rising (current level ${respiratoryIllness.rsvLevel.toLowerCase()}).`,
      );
    }
    if (isRising(respiratoryIllness.fluTrend)) {
      keySignals.push(
        `Flu activity is rising (current level ${respiratoryIllness.fluLevel.toLowerCase()}).`,
      );
    }
    if (isRising(respiratoryIllness.hospitalAdmissionTrend)) {
      keySignals.push(
        `Combined respiratory hospitalization rate is rising in Texas DSHS PHR 2/3 (${respiratoryIllness.currentHospitalizationRates.combined.toFixed(1)} per 100,000).`,
      );
    }
    recommendedActions.push(
      "Hold a few same-day sick visit slots and prepare a fever/cough triage script for front desk and MAs.",
    );
  }

  // Drug shortages
  const activeShortages = drugShortages.stale
    ? []
    : drugShortages.items.filter(
        (d) => d.status === "Shortage" || d.status === "Limited",
      );
  if (drugShortages.stale) {
    keySignals.push(
      "FDA shortage data did not refresh; retained statuses are not treated as current.",
    );
  } else if (activeShortages.length > 0) {
    concerns.push("medication availability");
    keySignals.push(
      `${activeShortages.length} pediatric-relevant medication(s) flagged as limited or in shortage.`,
    );
    recommendedActions.push(
      "Check pharmacy availability before prescribing constrained medications and prepare alternative regimens.",
    );
  }

  // Vaccine-preventable disease activity
  const vpdAbovePrior = vaccinePreventable?.stale
    ? []
    : vaccinePreventable?.items?.filter(
        (v) => v.status === "Above prior-year pace",
      ) ?? [];
  if (vaccinePreventable?.stale) {
    keySignals.push(
      "NNDSS data did not refresh; retained Texas totals are not treated as current.",
    );
  } else if (vpdAbovePrior.length > 0) {
    moderateConcerns.push("vaccine-preventable disease");
    const names = vpdAbovePrior
      .map((v) => v.diseaseName)
      .slice(0, 3)
      .join(", ");
    keySignals.push(
      `${names} provisional Texas totals are above the same period last year; this is not an outbreak determination.`,
    );
    recommendedActions.push(
      "Use well visits to confirm MMR, DTaP/Tdap, varicella, and HepA series are up to date.",
    );
  }

  // Community virus watch — flag any High/Rising entry
  const virusEntries = data.communityVirusWatch?.entries ?? [];
  const risingViruses = virusEntries.filter(
    (v) =>
      !v.stale &&
      isElevated(v.level) ||
      (!v.stale &&
        v.trend !== undefined &&
        isRising(v.trend) &&
        v.level !== "Low"),
  );
  if (risingViruses.length > 0) {
    moderateConcerns.push("community virus activity");
    const top = risingViruses.slice(0, 3).map((v) => v.name).join(", ");
    keySignals.push(
      `Community virus watch: ${top} ${risingViruses.length > 3 ? `(+${risingViruses.length - 3} more) ` : ""}elevated or rising regionally.`,
    );
  }

  // Risk level
  let riskLevel: RiskLevel;
  if (concerns.length >= 2) {
    riskLevel = "High";
  } else if (concerns.length === 1 || moderateConcerns.length >= 1) {
    riskLevel = "Moderate";
  } else {
    riskLevel = "Low";
  }

  // Headline
  let headline: string;
  if (riskLevel === "High") {
    headline = `Elevated clinic readiness: ${concerns.slice(0, 2).join(" and ")} signals active`;
  } else if (riskLevel === "Moderate") {
    const focus =
      concerns[0] ?? moderateConcerns[0] ?? "public-health signals";
    headline = `Moderate clinic readiness: ${focus} signal is elevated`;
  } else {
    headline =
      "Steady clinic readiness based on available current public-health signals";
  }

  // Summary paragraph (calm, operational)
  const summaryParts: string[] = [];
  summaryParts.push(
    airQuality.stale
      ? `AirNow did not refresh; the retained AQI ${airQuality.currentAqi} reading is not treated as current.`
      : `Air quality is currently ${airQuality.category.toLowerCase()} (AQI ${airQuality.currentAqi}) for ${airQuality.geography ?? "the AirNow reporting area"}.`,
  );
  summaryParts.push(
    pollen.stale
      ? "The pollen source did not refresh; retained pollen levels are not treated as current."
      : `Tree pollen is ${pollen.treeLevel.toLowerCase()} and grass pollen is ${pollen.grassLevel.toLowerCase()}.`,
  );
  if (respiratoryIllness.stale) {
    summaryParts.push(
      "The respiratory hospitalization source did not refresh; retained rates are not treated as current.",
    );
  } else if (respiratoryRising) {
    summaryParts.push(
      "Regional respiratory illness activity is trending up, so the clinic may see more cough, congestion, wheezing, and fever-related calls.",
    );
  } else {
    summaryParts.push(
      "Regional respiratory illness activity is stable.",
    );
  }
  if (activeShortages.length > 0) {
    summaryParts.push(
      "Some pediatric medications remain limited or in shortage; verify availability before sending high-volume prescriptions.",
    );
  }
  summaryParts.push(
    "Consider keeping allergy, asthma, and same-day sick visit workflows ready.",
  );
  const summary = summaryParts.join(" ");

  // Always include a couple of baseline operational actions if none added
  if (recommendedActions.length === 0) {
    recommendedActions.push(
      "Maintain routine respiratory season messaging for parents.",
      "Continue standard triage and prescribing workflows.",
    );
  }

  const emailSubject = `Luma Pediatric Pulse — ${riskLevel} readiness today`;
  const emailPreviewText =
    riskLevel === "Low"
      ? airQuality.stale || pollen.stale
        ? "Available current signals look steady; one or more environmental sources are showing last-known-good values."
        : "Available current illness and medication signals look calm. Routine workflows recommended."
      : `Public-health signals worth noting today: ${concerns.concat(moderateConcerns).slice(0, 3).join(", ") || "see dashboard for details"}.`;

  return {
    riskLevel,
    headline,
    summary,
    keySignals,
    recommendedActions,
    emailSubject,
    emailPreviewText,
  };
}
