export type RiskLevel = "Low" | "Moderate" | "High";

export type TrendDirection = "Decreasing" | "Stable" | "Rising";

export type SignalLevel =
  | "Low"
  | "Moderate"
  | "High"
  | "Very High"
  | "Unknown";

export type DrugShortageStatus =
  | "Available"
  | "Limited"
  | "Shortage"
  | "Resolved"
  | "Unknown";

export interface SourceMeta {
  source: string;
  lastUpdated: string;
  stale?: boolean;
  staleSince?: string;
  error?: string;
}

export interface AirQualityForecastPoint {
  date: string;
  aqi: number;
  category: string;
}

export interface AirQuality extends SourceMeta {
  currentAqi: number;
  category: string;
  primaryPollutant: string;
  forecast: AirQualityForecastPoint[];
  providerNote: string;
}

export interface PollenForecastPoint {
  date: string;
  tree: number;
  grass: number;
  weed: number;
}

export interface Pollen extends SourceMeta {
  treeLevel: SignalLevel;
  grassLevel: SignalLevel;
  weedLevel: SignalLevel;
  dominantAllergens: string[];
  forecast: PollenForecastPoint[];
  providerNote: string;
}

export interface RespiratoryWeeklyPoint {
  weekLabel: string;
  rsv: number;
  flu: number;
  covid: number;
  edRespiratoryVisits: number;
}

export interface RespiratoryIllness extends SourceMeta {
  rsvLevel: SignalLevel;
  rsvTrend: TrendDirection;
  fluLevel: SignalLevel;
  fluTrend: TrendDirection;
  covidLevel: SignalLevel;
  covidTrend: TrendDirection;
  edRespiratoryVisitTrend: TrendDirection;
  wastewaterTrend: string;
  geography: string;
  weeklyTrend: RespiratoryWeeklyPoint[];
  providerNote: string;
}

export interface DrugShortage {
  drugName: string;
  category: string;
  status: DrugShortageStatus;
  pediatricRelevance: string;
  suggestedProviderAction: string;
  lastUpdated: string;
  source: string;
}

export interface DrugShortagesSection extends SourceMeta {
  items: DrugShortage[];
}

export type VpdStatus =
  | "No recent cases"
  | "Sporadic"
  | "Outbreak watch"
  | "Active outbreak"
  | "Unknown";

export interface VaccinePreventableDisease {
  diseaseName: string;
  status: VpdStatus;
  recentCases: number;
  /** Same-period (YTD) cases reported in the prior year, for CDC observed-vs-expected comparison. */
  priorYearCases?: number;
  trend: TrendDirection;
  geography: string;
  vaccineRelevance: string;
  suggestedProviderAction: string;
  /** Human-readable explanation of why we classified the disease at the chosen status. */
  thresholdRationale?: string;
  lastUpdated?: string;
}

export interface VaccinePreventableSection extends SourceMeta {
  items: VaccinePreventableDisease[];
}

export interface ProviderSummary {
  riskLevel: RiskLevel;
  headline: string;
  summary: string;
  keySignals: string[];
  recommendedActions: string[];
  emailSubject: string;
  emailPreviewText: string;
}

export interface ProviderHealthWatchData {
  lastUpdated: string;
  lastRefreshedAt?: string;
  coverageArea: string[];
  airQuality: AirQuality;
  pollen: Pollen;
  respiratoryIllness: RespiratoryIllness;
  communityVirusWatch?: CommunityVirusWatch;
  drugShortages: DrugShortagesSection;
  vaccinePreventable: VaccinePreventableSection;
  operationalRecommendations: string[];
  sources: string[];
}

export type VirusCategory =
  | "respiratory"
  | "gastrointestinal"
  | "other-pediatric";

export interface CommunityVirusEntry {
  key: string;
  name: string;
  category: VirusCategory;
  level: SignalLevel;
  trend: TrendDirection;
  positivityPct?: number;
  parentNote: string;
  providerNote: string;
}

export interface CommunityVirusWatch extends SourceMeta {
  geography: string;
  entries: CommunityVirusEntry[];
  providerNote: string;
}
