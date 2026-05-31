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
      "Air quality is in the Good range across the North Dallas area. No additional asthma precautions indicated beyond routine asthma action plan use.",
    source: "EPA AirNow",
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
    source: "Pollen API",
    lastUpdated: iso(today),
  },

  respiratoryIllness: {
    rsvLevel: "Moderate",
    rsvTrend: "Rising",
    fluLevel: "Low",
    fluTrend: "Stable",
    covidLevel: "Low",
    covidTrend: "Stable",
    edRespiratoryVisitTrend: "Rising",
    wastewaterTrend:
      "Regional wastewater signal available at metro level only; not yet broken out by ZIP for the North Dallas area.",
    geography: "North Dallas region (Collin County and surrounding counties)",
    weeklyTrend: [
      { weekLabel: "Wk -5", rsv: 2, flu: 3, covid: 2, edRespiratoryVisits: 5 },
      { weekLabel: "Wk -4", rsv: 3, flu: 3, covid: 2, edRespiratoryVisits: 6 },
      { weekLabel: "Wk -3", rsv: 4, flu: 3, covid: 2, edRespiratoryVisits: 6 },
      { weekLabel: "Wk -2", rsv: 5, flu: 3, covid: 2, edRespiratoryVisits: 7 },
      { weekLabel: "Wk -1", rsv: 6, flu: 3, covid: 2, edRespiratoryVisits: 8 },
      { weekLabel: "This wk", rsv: 7, flu: 3, covid: 2, edRespiratoryVisits: 9 },
    ],
    providerNote:
      "Regional RSV activity is rising while flu and COVID remain low and stable. Anticipate more cough, congestion, wheezing, and fever-related calls; some signals are regional rather than ZIP-level.",
    source: "CDC / Texas DSHS",
    lastUpdated: iso(today),
  },

  communityVirusWatch: {
    geography: "North Dallas region (Collin County and surrounding counties)",
    entries: [
      {
        key: "rsv",
        name: "RSV",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 1.2,
        parentNote:
          "RSV is in its off-season. Very few cases circulating right now.",
        providerNote:
          "Test positivity at HHS Region 6 ~1%. Continue Beyfortus/Synagis discussion at well-child visits for fall season.",
      },
      {
        key: "flu-a",
        name: "Influenza A",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 1.8,
        parentNote: "Flu A activity has tapered off for the season.",
        providerNote:
          "End-of-season decline; sporadic H1N1/H3N2 detections only. Continue antiviral readiness for high-risk patients.",
      },
      {
        key: "flu-b",
        name: "Influenza B",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 0.4,
        parentNote: "Flu B is uncommon right now.",
        providerNote: "Minimal regional B/Victoria detections this week.",
      },
      {
        key: "covid",
        name: "COVID-19",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 3.5,
        parentNote:
          "COVID cases are low. Wastewater signal is also stable.",
        providerNote:
          "Wastewater stable; ED visit share for COVID-like illness <2%. Continue routine testing for fever + respiratory symptoms in high-risk pediatric patients.",
      },
      {
        key: "rhino-entero",
        name: "Rhinovirus / Enterovirus",
        category: "respiratory",
        level: "Moderate",
        trend: "Rising",
        positivityPct: 18.4,
        parentNote:
          "The common cold (rhinovirus) is the most active virus in our area right now.",
        providerNote:
          "Highest positivity across the panel. Expect increased URI / asthma-exacerbation calls. Reinforce asthma action plans.",
      },
      {
        key: "hmpv",
        name: "Human Metapneumovirus (hMPV)",
        category: "respiratory",
        level: "Low",
        trend: "Decreasing",
        positivityPct: 2.1,
        parentNote: "hMPV is winding down after its spring peak.",
        providerNote:
          "Late-season decline; consider hMPV for RSV-like presentations testing RSV-negative.",
      },
      {
        key: "parainfluenza",
        name: "Parainfluenza",
        category: "respiratory",
        level: "Moderate",
        trend: "Rising",
        positivityPct: 8.6,
        parentNote:
          "Parainfluenza is rising — this is the main cause of croup (barky cough).",
        providerNote:
          "PIV-3 peak typically May–June; expect more croup. Have steroid + nebulized epi readily available.",
      },
      {
        key: "adenovirus",
        name: "Adenovirus",
        category: "respiratory",
        level: "Low",
        trend: "Stable",
        positivityPct: 2.8,
        parentNote: "Adenovirus activity is low right now.",
        providerNote:
          "Sporadic; consider in fever + conjunctivitis or prolonged febrile illness.",
      },
      {
        key: "norovirus",
        name: "Norovirus",
        category: "gastrointestinal",
        level: "Low",
        trend: "Decreasing",
        positivityPct: 6.1,
        parentNote:
          "Stomach-bug (norovirus) season is winding down.",
        providerNote:
          "NoroSTAT regional activity past peak. Reinforce hand-hygiene and hydration guidance.",
      },
      {
        key: "rotavirus",
        name: "Rotavirus",
        category: "gastrointestinal",
        level: "Low",
        trend: "Stable",
        positivityPct: 0.9,
        parentNote: "Rotavirus is rare thanks to widespread vaccination.",
        providerNote:
          "Ensure 2-/3-dose Rota series completion at 2/4 (/6) month visits.",
      },
      {
        key: "hfmd",
        name: "Hand, Foot & Mouth Disease",
        category: "other-pediatric",
        level: "Moderate",
        trend: "Rising",
        parentNote:
          "Hand, foot & mouth disease is picking up as we head into summer — daycare and camp settings especially.",
        providerNote:
          "Coxsackie A6/A16 entering seasonal rise. Reassure families re: symptomatic care; review return-to-daycare criteria.",
      },
      {
        key: "fifth-disease",
        name: "Fifth Disease (Parvovirus B19)",
        category: "other-pediatric",
        level: "Moderate",
        trend: "Stable",
        parentNote:
          "Fifth disease is around right now — look for the 'slapped-cheek' rash. Most kids do fine.",
        providerNote:
          "Elevated regional B19 activity since late 2024. Flag pregnant household contacts and patients with hemolytic anemia / immunocompromise.",
      },
    ],
    providerNote:
      "Spring/early-summer pattern: winter respiratory viruses (RSV, flu, hMPV) declining; rhinovirus, parainfluenza, HFMD, and parvovirus B19 active. Norovirus and rotavirus seasonally low.",
    source: "CDC NREVSS / NoroSTAT / Texas DSHS",
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
    source: "CDC NNDSS / Texas DSHS",
    lastUpdated: iso(today),
    items: [
      {
        diseaseName: "Measles",
        status: "Outbreak watch",
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
        status: "Sporadic",
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
        status: "Sporadic",
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
        status: "Sporadic",
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
        status: "No recent cases",
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
        status: "Sporadic",
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
