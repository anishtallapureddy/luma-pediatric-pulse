import type { ProviderHealthWatchData } from "@/types/health-watch";

const today = new Date();
const iso = (d: Date) => d.toISOString();

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const mockProviderHealthWatchData: ProviderHealthWatchData = {
  lastUpdated: iso(today),
  lastRefreshedAt: iso(today),
  coverageArea: [
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
  ],

  airQuality: {
    currentAqi: 42,
    category: "Good",
    primaryPollutant: "Ozone",
    forecast: [
      { date: ymd(addDays(today, 1)), aqi: 48, category: "Good" },
      { date: ymd(addDays(today, 2)), aqi: 56, category: "Moderate" },
      { date: ymd(addDays(today, 3)), aqi: 51, category: "Moderate" },
    ],
    providerNote:
      "Air quality is in the Good range. No additional asthma precautions indicated beyond routine asthma action plan use.",
    source: "EPA AirNow",
    sourceUrl: "https://www.airnow.gov/",
    geography: "Dallas-Fort Worth AirNow reporting area",
    reportingDate: iso(today),
    fetchedAt: iso(today),
    metric: "Air Quality Index (AQI), preliminary AirNow observation",
    lastUpdated: iso(today),
  },

  pollen: {
    treeLevel: "High",
    grassLevel: "Moderate",
    weedLevel: "Low",
    dominantAllergens: ["Oak", "Cedar", "Elm"],
    forecast: [
      { date: ymd(today), tree: 8.4, grass: 4.1, weed: 1.6 },
      { date: ymd(addDays(today, 1)), tree: 8.8, grass: 4.3, weed: 1.5 },
      { date: ymd(addDays(today, 2)), tree: 7.9, grass: 4.0, weed: 1.8 },
      { date: ymd(addDays(today, 3)), tree: 7.2, grass: 3.7, weed: 2.1 },
      { date: ymd(addDays(today, 4)), tree: 6.5, grass: 3.4, weed: 2.4 },
    ],
    providerNote:
      "Tree pollen is high (oak, cedar, elm dominant). Expect more allergy-symptom and wheezing-related calls from patients with known asthma or allergic rhinitis.",
    source: "Google Pollen API",
    sourceUrl: "https://developers.google.com/maps/documentation/pollen",
    geography: "Modeled forecast near McKinney",
    reportingDate: ymd(today),
    fetchedAt: iso(today),
    metric: "Google pollen index forecast",
    lastUpdated: iso(today),
  },

  respiratoryIllness: {
    rsvLevel: "Moderate",
    rsvTrend: "Rising",
    fluLevel: "Low",
    fluTrend: "Stable",
    covidLevel: "Low",
    covidTrend: "Stable",
    hospitalAdmissionTrend: "Rising",
    currentHospitalizationRates: {
      rsv: 0.2,
      flu: 0.4,
      covid: 1.6,
      combined: 2.2,
    },
    wastewaterTrend: "Wastewater is not included in this hospitalization dataset.",
    geography: "Texas DSHS Public Health Region 2/3",
    weeklyTrend: [
      { weekLabel: "Wk -5", rsv: 0.1, flu: 0.2, covid: 0.6, hospitalAdmissions: 0.9 },
      { weekLabel: "Wk -4", rsv: 0.1, flu: 0.2, covid: 0.7, hospitalAdmissions: 1 },
      { weekLabel: "Wk -3", rsv: 0.1, flu: 0.2, covid: 0.8, hospitalAdmissions: 1.1 },
      { weekLabel: "Wk -2", rsv: 0.1, flu: 0.3, covid: 0.9, hospitalAdmissions: 1.3 },
      { weekLabel: "Wk -1", rsv: 0.2, flu: 0.3, covid: 1.2, hospitalAdmissions: 1.7 },
      { weekLabel: "This wk", rsv: 0.2, flu: 0.4, covid: 1.6, hospitalAdmissions: 2.2 },
    ],
    providerNote:
      "PHR 2/3 hospitalization rates are shown as weekly new laboratory-confirmed admissions per 100,000.",
    source: "Texas DSHS respiratory hospitalization surveillance",
    sourceUrl:
      "https://services3.arcgis.com/vljlarU2635mITsl/arcgis/rest/services/COVID_Influenza_RSV_Hospitalization_Rates/FeatureServer/0",
    reportingDate: iso(today),
    fetchedAt: iso(today),
    metric: "Weekly new laboratory-confirmed hospital admissions per 100,000",
    lastUpdated: iso(today),
  },

  communityVirusWatch: {
    geography: "Texas, HHS Region 6, and United States; see each card",
    entries: [
      {
        key: "rsv",
        name: "RSV",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 1.2,
        surveillanceKind: "quantitative",
        sourceName: "CDC NREVSS",
        geography: "Texas",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Centered three-week average percent of NAAT tests positive",
        parentNote: "RSV laboratory test positivity is stable across Texas.",
        providerNote: "CDC NREVSS Texas laboratory test positivity.",
      },
      {
        key: "influenza",
        name: "Influenza",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 1.8,
        surveillanceKind: "quantitative",
        sourceName: "CDC national respiratory laboratory surveillance",
        geography: "United States",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Percent of clinical laboratory influenza tests positive",
        parentNote: "Influenza laboratory test positivity is stable nationally.",
        providerNote: "Combined influenza clinical-laboratory test positivity.",
      },
      {
        key: "covid",
        name: "COVID-19",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 3.5,
        surveillanceKind: "quantitative",
        sourceName: "CDC NREVSS",
        geography: "Texas",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Centered three-week average percent of NAAT tests positive",
        parentNote: "COVID-19 laboratory test positivity is stable across Texas.",
        providerNote: "CDC NREVSS Texas laboratory test positivity.",
      },
      {
        key: "rhino-entero",
        name: "Rhinovirus / Enterovirus",
        category: "respiratory",
        level: "Moderate",
        trend: "Rising",
        positivityPct: 18.4,
        surveillanceKind: "quantitative",
        sourceName: "CDC NREVSS",
        geography: "HHS Region 6 (AR, LA, NM, OK, TX)",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Weekly percent of NAAT tests positive",
        parentNote: "Rhinovirus/enterovirus laboratory positivity is increasing across HHS Region 6.",
        providerNote: "CDC NREVSS HHS Region 6 laboratory test positivity.",
      },
      {
        key: "hmpv",
        name: "Human Metapneumovirus (hMPV)",
        category: "respiratory",
        level: "Low",
        trend: "Decreasing",
        positivityPct: 2.1,
        surveillanceKind: "quantitative",
        sourceName: "CDC NREVSS",
        geography: "HHS Region 6 (AR, LA, NM, OK, TX)",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Weekly percent of NAAT tests positive",
        parentNote: "hMPV laboratory positivity is easing across HHS Region 6.",
        providerNote: "CDC NREVSS HHS Region 6 laboratory test positivity.",
      },
      {
        key: "parainfluenza",
        name: "Parainfluenza",
        category: "respiratory",
        level: "Moderate",
        trend: "Rising",
        positivityPct: 8.6,
        surveillanceKind: "quantitative",
        sourceName: "CDC NREVSS",
        geography: "HHS Region 6 (AR, LA, NM, OK, TX)",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Weekly percent of NAAT tests positive",
        parentNote: "Parainfluenza laboratory positivity is increasing across HHS Region 6.",
        providerNote: "CDC NREVSS HHS Region 6 laboratory test positivity.",
      },
      {
        key: "adenovirus",
        name: "Adenovirus",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 2.8,
        surveillanceKind: "quantitative",
        sourceName: "CDC NREVSS",
        geography: "HHS Region 6 (AR, LA, NM, OK, TX)",
        sourceReportingDate: iso(today),
        fetchedAt: iso(today),
        metric: "Weekly percent of NAAT tests positive",
        parentNote: "Adenovirus laboratory positivity is stable across HHS Region 6.",
        providerNote: "CDC NREVSS HHS Region 6 laboratory test positivity.",
      },
      {
        key: "norovirus",
        name: "Norovirus",
        category: "gastrointestinal",
        level: "Unknown",
        surveillanceKind: "regional",
        statusLabel: "Regional surveillance only",
        sourceName: "CDC NREVSS",
        geography: "Southern U.S. Census Region",
        parentNote:
          "CDC tracks norovirus across the Southern U.S., but a reliable current local activity level is not available.",
        providerNote: "See the official CDC NREVSS enteric-virus dashboard.",
      },
      {
        key: "rotavirus",
        name: "Rotavirus",
        category: "gastrointestinal",
        level: "Unknown",
        surveillanceKind: "regional",
        statusLabel: "Regional surveillance only",
        sourceName: "CDC NREVSS",
        geography: "Southern U.S. Census Region",
        parentNote:
          "CDC tracks rotavirus across the Southern U.S., but a reliable current local activity level is not available.",
        providerNote: "See the official CDC NREVSS enteric-virus dashboard.",
      },
      {
        key: "hfmd",
        name: "Hand, Foot & Mouth Disease",
        category: "other-pediatric",
        level: "Unknown",
        surveillanceKind: "seasonal",
        statusLabel: "Seasonal watch",
        sourceName: "CDC and Texas DSHS guidance",
        geography: "Seasonal context; not a local activity estimate",
        parentNote:
          "HFMD commonly circulates in summer and fall, especially in childcare and school settings.",
        providerNote:
          "Seasonal watch only. Do not infer a local outbreak without an official notice.",
      },
      {
        key: "fifth-disease",
        name: "Fifth Disease (Parvovirus B19)",
        category: "other-pediatric",
        level: "Unknown",
        surveillanceKind: "limited",
        statusLabel: "Local surveillance limited",
        sourceName: "CDC",
        geography: "No routine local surveillance",
        parentNote:
          "Routine local Parvovirus B19 surveillance is limited, so a reliable current local activity level is not available.",
        providerNote:
          "Parvovirus B19 is not nationally notifiable and has no routine U.S. surveillance feed.",
      },
    ],
    providerNote:
      "Each quantitative value identifies its source geography and reporting week.",
    source: "CDC NREVSS and CDC national respiratory laboratory surveillance",
    sourceUrl: "https://www.cdc.gov/nrevss/php/dashboard/index.html",
    reportingDate: iso(today),
    fetchedAt: iso(today),
    metric: "Laboratory test positivity; metric and geography vary by virus",
    lastUpdated: iso(today),
  },

  drugShortages: {
    source: "FDA Drug Shortages",
    lastUpdated: iso(today),
    items: [
    {
      drugName: "Amoxicillin (suspension)",
      category: "Antibiotic",
      status: "Limited",
      pediatricRelevance:
        "First-line for AOM, strep pharyngitis, CAP in many pediatric patients.",
      suggestedProviderAction:
        "Confirm pharmacy availability before prescribing high-volume liquid formulations; consider alternative concentrations.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Amoxicillin-clavulanate (suspension)",
      category: "Antibiotic",
      status: "Limited",
      pediatricRelevance:
        "Common second-line for AOM and sinusitis when amoxicillin is insufficient.",
      suggestedProviderAction:
        "Verify availability with local pharmacy before sending; have alternate regimens ready.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Cefdinir (suspension)",
      category: "Antibiotic",
      status: "Available",
      pediatricRelevance: "Common penicillin alternative for AOM and sinusitis.",
      suggestedProviderAction:
        "Generally available; monitor for changes if amoxicillin demand surges.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Albuterol HFA inhaler",
      category: "Bronchodilator",
      status: "Available",
      pediatricRelevance:
        "Core rescue therapy for pediatric asthma and reactive airway disease.",
      suggestedProviderAction:
        "Reinforce spacer use and asthma action plans; remind families to refill before respiratory season peaks.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Albuterol nebulizer solution",
      category: "Bronchodilator",
      status: "Limited",
      pediatricRelevance:
        "Used for in-clinic nebulizer treatments and home neb therapy in younger children.",
      suggestedProviderAction:
        "Track on-hand clinic stock; prefer MDI + spacer when clinically appropriate.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Oseltamivir (suspension)",
      category: "Antiviral",
      status: "Available",
      pediatricRelevance:
        "Influenza treatment in eligible pediatric patients during flu season.",
      suggestedProviderAction:
        "Currently available; revisit if regional flu activity rises.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Methylphenidate",
      category: "ADHD stimulant",
      status: "Shortage",
      pediatricRelevance:
        "Common ADHD therapy; shortages affect refill workflows and family planning.",
      suggestedProviderAction:
        "Discuss formulation alternatives with family; coordinate with pharmacy before changing dose or product.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    {
      drugName: "Amphetamine / dextroamphetamine",
      category: "ADHD stimulant",
      status: "Shortage",
      pediatricRelevance:
        "Alternate ADHD therapy; shortages affect refill and switching options.",
      suggestedProviderAction:
        "Plan refill timing carefully; consider documented alternative regimens per family.",
      lastUpdated: iso(today),
      source: "FDA Drug Shortages",
    },
    ],
  },

  vaccinePreventable: {
    source: "CDC NNDSS Weekly Data (Texas)",
    sourceUrl: "https://data.cdc.gov/d/x9gk-5huc",
    geography: "Texas",
    reportingDate: `${today.getUTCFullYear()} MMWR week sample`,
    fetchedAt: iso(today),
    metric: "Provisional year-to-date reported cases",
    lastUpdated: iso(today),
    items: [
      {
        diseaseName: "Measles",
        status: "No cases reported",
        recentCases: 0,
        trend: "Stable",
        geography: "Texas (state-level)",
        vaccineRelevance:
          "MMR-preventable. Highly contagious; airborne. Confirm MMR1 (12-15 mo) and MMR2 (4-6 yr) status at every visit.",
        suggestedProviderAction:
          "Verify MMR status, prompt catch-up doses, and review measles isolation/notification protocol with staff.",
      },
      {
        diseaseName: "Pertussis (whooping cough)",
        status: "Reported cases",
        recentCases: 4,
        trend: "Stable",
        geography: "Texas (state-level)",
        vaccineRelevance:
          "DTaP/Tdap-preventable. Infants under 2 mo are highest-risk. Cocoon strategy: confirm caregiver Tdap.",
        suggestedProviderAction:
          "Maintain a low threshold for testing prolonged paroxysmal cough; confirm DTaP series and Tdap for adolescents.",
      },
      {
        diseaseName: "Hepatitis A",
        status: "Reported cases",
        recentCases: 2,
        trend: "Stable",
        geography: "Texas (state-level)",
        vaccineRelevance:
          "HepA-preventable. Two-dose series starting at 12 mo.",
        suggestedProviderAction:
          "Confirm HepA series at well visits; emphasize for travel to endemic regions.",
      },
      {
        diseaseName: "Varicella (chickenpox)",
        status: "Reported cases",
        recentCases: 3,
        trend: "Stable",
        geography: "Texas (state-level)",
        vaccineRelevance:
          "Varicella-preventable. Two-dose series (12-15 mo, 4-6 yr).",
        suggestedProviderAction:
          "Confirm two-dose varicella status at school-age visits; counsel on rash isolation.",
      },
      {
        diseaseName: "Mumps",
        status: "No cases reported",
        recentCases: 0,
        trend: "Stable",
        geography: "Texas (state-level)",
        vaccineRelevance:
          "MMR-preventable. Outbreaks often occur in close-contact settings (camps, schools).",
        suggestedProviderAction:
          "Confirm MMR2 in school-age and adolescents; review parotitis differential during outbreaks.",
      },
      {
        diseaseName: "Invasive pneumococcal disease",
        status: "Reported cases",
        recentCases: 1,
        trend: "Stable",
        geography: "Texas (state-level)",
        vaccineRelevance:
          "PCV15/PCV20-preventable. Series at 2, 4, 6, 12-15 mo.",
        suggestedProviderAction:
          "Confirm PCV series; review post-splenectomy and high-risk indications.",
      },
    ],
  },

  operationalRecommendations: [
    "Hold a few same-day sick visit slots if call volume rises this week.",
    "Keep allergy and asthma guidance materials ready for families calling about cough or wheeze.",
    "Reinforce asthma action plan use during visits for wheezing or asthma-history patients.",
    "Prepare a simple fever/cough triage script for front desk and MAs.",
    "Check local pharmacy availability before sending prescriptions for constrained medications.",
    "Review respiratory season parent messaging (handwashing, sick-day plans, when to call).",
  ],

  sources: [
    "EPA AirNow (air quality)",
    "Pollen API (tree, grass, weed pollen levels)",
    "CDC / Texas DSHS (respiratory illness surveillance)",
    "FDA Drug Shortages / openFDA (medication availability)",
    "CDC NNDSS / Texas DSHS (vaccine-preventable disease surveillance)",
  ],
};
