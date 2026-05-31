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
  if (isElevated(pollen.treeLevel)) {
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
  if (airQuality.currentAqi > 100) {
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
    (isElevated(respiratoryIllness.rsvLevel) ||
      isRising(respiratoryIllness.rsvTrend)) ||
    (isElevated(respiratoryIllness.fluLevel) ||
      isRising(respiratoryIllness.fluTrend)) ||
    (isElevated(respiratoryIllness.covidLevel) ||
      isRising(respiratoryIllness.covidTrend)) ||
    isRising(respiratoryIllness.edRespiratoryVisitTrend);

  if (respiratoryRising) {
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
    if (isRising(respiratoryIllness.edRespiratoryVisitTrend)) {
      keySignals.push("ED respiratory visit trend is rising.");
    }
    recommendedActions.push(
      "Hold a few same-day sick visit slots and prepare a fever/cough triage script for front desk and MAs.",
    );
  }

  // Drug shortages
  const activeShortages = drugShortages.items.filter(
    (d) => d.status === "Shortage" || d.status === "Limited",
  );
  if (activeShortages.length > 0) {
    concerns.push("medication availability");
    keySignals.push(
      `${activeShortages.length} pediatric-relevant medication(s) flagged as limited or in shortage.`,
    );
    recommendedActions.push(
      "Check pharmacy availability before prescribing constrained medications and prepare alternative regimens.",
    );
  }

  // Vaccine-preventable disease activity
  const vpdActive = vaccinePreventable?.items?.filter(
    (v) => v.status === "Active outbreak",
  ) ?? [];
  const vpdWatch = vaccinePreventable?.items?.filter(
    (v) => v.status === "Outbreak watch" || v.trend === "Rising",
  ) ?? [];
  if (vpdActive.length > 0) {
    concerns.push("vaccine-preventable disease");
    concerns.push("VPD outbreak"); // counts as 2 so risk auto-elevates to High
    for (const v of vpdActive) {
      keySignals.push(
        `Active ${v.diseaseName} activity reported (${v.geography}). Confirm vaccination status at every visit.`,
      );
    }
    recommendedActions.push(
      "Verify MMR/DTaP/varicella/HepA status at every visit and run catch-up checks during well visits.",
    );
    recommendedActions.push(
      "Review measles/pertussis isolation, masking, and notification protocols with clinical staff.",
    );
  } else if (vpdWatch.length > 0) {
    moderateConcerns.push("vaccine-preventable disease");
    const names = vpdWatch.map((v) => v.diseaseName).slice(0, 3).join(", ");
    keySignals.push(`Watch for ${names} activity at the state level; verify vaccine status.`);
    recommendedActions.push(
      "Use well visits to confirm MMR, DTaP/Tdap, varicella, and HepA series are up to date.",
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
    const focus = concerns[0] ?? moderateConcerns[0] ?? "local health signals";
    headline = `Moderate clinic readiness: ${focus} signal active in the McKinney area`;
  } else {
    headline = "Steady clinic readiness: local health signals look calm";
  }

  // Summary paragraph (calm, operational)
  const summaryParts: string[] = [];
  summaryParts.push(
    `Air quality is currently ${airQuality.category.toLowerCase()} (AQI ${airQuality.currentAqi}) across the McKinney area.`,
  );
  summaryParts.push(
    `Tree pollen is ${pollen.treeLevel.toLowerCase()} and grass pollen is ${pollen.grassLevel.toLowerCase()}.`,
  );
  if (respiratoryRising) {
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
      ? "Local air, pollen, illness, and medication signals look calm. Routine workflows recommended."
      : `Local signals worth noting today: ${concerns.concat(moderateConcerns).slice(0, 3).join(", ") || "see dashboard for details"}.`;

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
