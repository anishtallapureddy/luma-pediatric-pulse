import { Clock, MapPin, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { ProviderSummary } from "@/types/health-watch";
import { riskBadgeClasses } from "./badgeStyles";

interface Props {
  summary: ProviderSummary;
  lastUpdated: string;
  lastRefreshedAt?: string;
  coverageArea: string[];
}

const accentLeft: Record<string, string> = {
  Low: "border-l-luma-sage",
  Moderate: "border-l-luma-sun",
  High: "border-l-luma-coral",
};

export default function SummaryCard({
  summary,
  lastUpdated,
  lastRefreshedAt,
  coverageArea,
}: Props) {
  const updated = format(new Date(lastUpdated), "PP · p");
  const refreshed = lastRefreshedAt
    ? format(new Date(lastRefreshedAt), "PP · p")
    : null;

  return (
    <section
      className={`bg-luma-cream-card rounded-card border border-luma-border shadow-elevated p-7 border-l-[6px] ${accentLeft[summary.riskLevel]}`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Today at a glance</p>
          <h2 className="mt-1.5 font-display text-[28px] sm:text-[34px] lg:text-[38px] text-luma-navy leading-[1.1] max-w-2xl">
            {summary.headline}
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-full border whitespace-nowrap ${riskBadgeClasses(summary.riskLevel)}`}
        >
          <Sparkles size={14} aria-hidden /> {summary.riskLevel} readiness
        </span>
      </div>

      <p className="mt-4 text-luma-navy/80 text-[15px] sm:text-base leading-relaxed max-w-3xl">
        {summary.summary}
      </p>

      {summary.keySignals.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {summary.keySignals.map((s) => (
            <div
              key={s}
              className="flex items-start gap-2 rounded-xl bg-luma-cream-muted/60 border border-luma-border px-3.5 py-2.5"
            >
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-luma-sun shrink-0" />
              <span className="text-sm text-luma-navy/90 leading-snug">{s}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-luma-border flex flex-wrap gap-x-6 gap-y-2 text-xs text-luma-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} aria-hidden /> Snapshot {updated}
        </span>
        {refreshed && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} aria-hidden /> Refreshed {refreshed}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} aria-hidden /> Coverage:{" "}
          {coverageArea.slice(0, 4).join(", ")}
          {coverageArea.length > 4 ? ` +${coverageArea.length - 4} more` : ""}
        </span>
      </div>
    </section>
  );
}
