"use client";

import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type {
  CommunityVirusWatch,
  CommunityVirusEntry,
  TrendDirection,
  VirusCategory,
} from "@/types/health-watch";
import { cardClasses, signalBadgeClasses } from "./badgeStyles";
import StaleBadge from "./StaleBadge";

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "Rising")
    return <TrendingUp size={14} className="text-red-600" aria-label="Rising" />;
  if (trend === "Decreasing")
    return (
      <TrendingDown size={14} className="text-emerald-600" aria-label="Decreasing" />
    );
  return <Minus size={14} className="text-luma-muted" aria-label="Stable" />;
}

const CATEGORY_LABELS: Record<VirusCategory, string> = {
  respiratory: "Respiratory viruses",
  gastrointestinal: "Gastrointestinal viruses",
  "other-pediatric": "Other common pediatric viral illnesses",
};

const CATEGORY_ORDER: VirusCategory[] = [
  "respiratory",
  "gastrointestinal",
  "other-pediatric",
];

function VirusRow({ v }: { v: CommunityVirusEntry }) {
  return (
    <div className="rounded-lg border border-luma-border bg-luma-cream-muted/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-luma-navy truncate">
            {v.name}
          </span>
          {typeof v.positivityPct === "number" && (
            <span className="text-[11px] text-luma-muted whitespace-nowrap">
              {v.positivityPct.toFixed(1)}% positivity
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${signalBadgeClasses(v.level)}`}
          >
            {v.level}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-luma-muted">
            <TrendIcon trend={v.trend} />
            {v.trend}
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-luma-navy/80 leading-snug">
        {v.providerNote}
      </p>
    </div>
  );
}

export default function CommunityVirusWatchCard({
  data,
}: {
  data: CommunityVirusWatch;
}) {
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    entries: data.entries.filter((e) => e.category === cat),
  })).filter((g) => g.entries.length > 0);

  return (
    <section className={cardClasses()}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luma-navy/10 text-luma-navy">
            <Activity size={20} aria-hidden />
          </div>
          <div>
            <h3 className="section-title">Community virus watch</h3>
            <p className="text-xs text-luma-muted">Source: {data.source}</p>
          </div>
        </div>
        <span className="text-xs text-luma-muted">{data.geography}</span>
        <StaleBadge meta={data} />
      </div>

      <div className="mt-5 space-y-5">
        {byCategory.map((group) => (
          <div key={group.category}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-luma-muted mb-2">
              {group.label}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {group.entries.map((v) => (
                <VirusRow key={v.key} v={v} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-luma-navy/80 leading-relaxed">
        {data.providerNote}
      </p>
      <p className="mt-2 text-xs text-luma-muted">
        Levels reflect regional surveillance (HHS Region 6 / Texas DSHS); local
        ZIP-level data is not yet broken out for most signals.
      </p>
    </section>
  );
}
