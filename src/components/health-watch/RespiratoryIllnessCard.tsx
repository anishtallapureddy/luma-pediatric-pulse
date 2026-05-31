"use client";

import { Stethoscope, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type {
  RespiratoryIllness,
  TrendDirection,
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

export default function RespiratoryIllnessCard({
  data,
}: {
  data: RespiratoryIllness;
}) {
  const rows = [
    { label: "RSV", level: data.rsvLevel, trend: data.rsvTrend },
    { label: "Flu", level: data.fluLevel, trend: data.fluTrend },
    { label: "COVID", level: data.covidLevel, trend: data.covidTrend },
  ];

  const chartData = data.weeklyTrend.map((p) => ({
    week: p.weekLabel,
    RSV: p.rsv,
    Flu: p.flu,
    COVID: p.covid,
    ED: p.edRespiratoryVisits,
  }));

  return (
    <section className={cardClasses()}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luma-navy/10 text-luma-navy">
            <Stethoscope size={20} aria-hidden />
          </div>
          <div>
            <h3 className="section-title">
              Respiratory illness activity
            </h3>
            <p className="text-xs text-luma-muted">Source: {data.source}</p>
          </div>
        </div>
        <span className="text-xs text-luma-muted">{data.geography}</span>
        <StaleBadge meta={data} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-luma-border bg-luma-cream-muted/50 px-2 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-luma-navy/80">
                {row.label}
              </span>
              <TrendIcon trend={row.trend} />
            </div>
            <span
              className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${signalBadgeClasses(row.level)}`}
            >
              {row.level}
            </span>
            <div className="mt-1 text-[11px] text-luma-muted">{row.trend}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-luma-border bg-luma-cream-muted/50 px-3 py-2">
          <div className="text-xs font-semibold text-luma-navy/80">
            ED respiratory visits
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-luma-navy">
            <TrendIcon trend={data.edRespiratoryVisitTrend} />
            {data.edRespiratoryVisitTrend}
          </div>
        </div>
        <div className="rounded-lg border border-luma-border bg-luma-cream-muted/50 px-3 py-2">
          <div className="text-xs font-semibold text-luma-navy/80">Wastewater</div>
          <div className="mt-1 text-luma-navy/80 text-xs leading-snug">
            {data.wastewaterTrend}
          </div>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="RSV" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Flu" stroke="#d97706" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="COVID" stroke="#7c3aed" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ED" stroke="#dc2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm text-luma-navy/80 leading-relaxed">
        {data.providerNote}
      </p>
      <p className="mt-2 text-xs text-luma-muted">
        Some signals are regional rather than ZIP-level; interpret with local
        context.
      </p>
    </section>
  );
}
