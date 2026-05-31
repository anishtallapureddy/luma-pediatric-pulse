import { loadSnapshot } from "@/lib/health-watch/loadSnapshot";
import { generateProviderSummary } from "@/lib/health-watch/generateProviderSummary";
import SummaryCard from "@/components/health-watch/SummaryCard";
import AirQualityCard from "@/components/health-watch/AirQualityCard";
import PollenCard from "@/components/health-watch/PollenCard";
import RespiratoryIllnessCard from "@/components/health-watch/RespiratoryIllnessCard";
import DrugShortageCard from "@/components/health-watch/DrugShortageCard";
import VaccinePreventableCard from "@/components/health-watch/VaccinePreventableCard";
import OperationalRecommendationsCard from "@/components/health-watch/OperationalRecommendationsCard";
import SourceFooter from "@/components/health-watch/SourceFooter";
import GlanceStrip from "@/components/health-watch/GlanceStrip";
import { Heart } from "lucide-react";
import { format } from "date-fns";

export default function ProviderHealthWatchPage() {
  const data = loadSnapshot();
  const summary = generateProviderSummary(data);
  const refreshed = data.lastRefreshedAt
    ? format(new Date(data.lastRefreshedAt), "EEEE, MMM d · h:mm a")
    : null;

  return (
    <main className="min-h-screen bg-luma-cream text-luma-navy">
      {/* Brand top bar */}
      <div className="border-b border-luma-border bg-luma-cream-card/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-luma-navy text-luma-cream">
              <Heart size={16} aria-hidden fill="currentColor" />
            </span>
            <span className="font-display text-xl text-luma-navy leading-none">
              Luma Pediatrics
            </span>
            <span className="hidden sm:inline text-luma-muted text-xs ml-2">
              McKinney, TX
            </span>
          </div>
          <span className="text-xs text-luma-muted hidden sm:inline">
            Internal · Provider use only
          </span>
        </div>
      </div>

      {/* Hero */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <p className="eyebrow text-luma-sage-hover">
          Pediatric Pulse · Daily local signal
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-[44px] lg:text-5xl text-luma-navy leading-[1.08] max-w-3xl">
          What North Dallas pediatric families are bringing in today.
        </h1>
        <p className="mt-4 text-luma-navy/75 max-w-2xl text-base sm:text-lg leading-relaxed">
          A morning snapshot of air quality, pollen, respiratory illness,
          vaccine-preventable activity, and pediatric medication signals — so
          the clinic can plan triage, staffing, and prescribing with confidence.
        </p>
        {refreshed && (
          <p className="mt-3 text-xs sm:text-sm text-luma-muted">
            Refreshed {refreshed} CT · McKinney · Melissa · Anna · Prosper ·
            Frisco · Celina · Van Alstyne · North DFW
          </p>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        {/* At-a-glance KPI strip */}
        <GlanceStrip data={data} />

        {/* Today's readiness — the lead */}
        <SummaryCard
          summary={summary}
          lastUpdated={data.lastUpdated}
          lastRefreshedAt={data.lastRefreshedAt}
          coverageArea={data.coverageArea}
        />

        {/* Recommended actions — high-engagement next */}
        <OperationalRecommendationsCard
          recommendations={[
            ...summary.recommendedActions,
            ...data.operationalRecommendations,
          ]
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 6)}
        />

        {/* Environmental signals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="air-quality" className="scroll-mt-24">
            <AirQualityCard data={data.airQuality} />
          </div>
          <div id="pollen" className="scroll-mt-24">
            <PollenCard data={data.pollen} />
          </div>
        </div>

        {/* Illness surveillance */}
        <div id="respiratory" className="scroll-mt-24">
          <RespiratoryIllnessCard data={data.respiratoryIllness} />
        </div>

        {/* Vaccine-preventable disease watch */}
        <div id="vaccines" className="scroll-mt-24">
          <VaccinePreventableCard data={data.vaccinePreventable} />
        </div>

        {/* Medication availability */}
        <div id="medications" className="scroll-mt-24">
          <DrugShortageCard data={data.drugShortages} />
        </div>

        {/* Sources / disclaimer */}
        <SourceFooter sources={data.sources} />
      </div>
    </main>
  );
}
