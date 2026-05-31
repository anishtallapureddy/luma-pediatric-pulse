"use client";

import { Flower2 } from "lucide-react";
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
import { format } from "date-fns";
import type { Pollen } from "@/types/health-watch";
import { cardClasses, signalBadgeClasses } from "./badgeStyles";
import StaleBadge from "./StaleBadge";

export default function PollenCard({ data }: { data: Pollen }) {
  const chartData = data.forecast.map((p) => ({
    day: format(new Date(p.date), "EEE"),
    Tree: p.tree,
    Grass: p.grass,
    Weed: p.weed,
  }));

  return (
    <section className={cardClasses()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luma-sage/15 text-luma-sage-hover">
            <Flower2 size={20} aria-hidden />
          </div>
          <div>
            <h3 className="section-title">Pollen</h3>
            <p className="text-xs text-luma-muted">Source: {data.source}</p>
          </div>
        </div>
        <StaleBadge meta={data} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { label: "Tree", level: data.treeLevel },
          { label: "Grass", level: data.grassLevel },
          { label: "Weed", level: data.weedLevel },
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-luma-border bg-luma-cream-muted/50 px-2 py-2 text-center"
          >
            <div className="text-xs text-luma-muted">{row.label}</div>
            <span
              className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${signalBadgeClasses(row.level)}`}
            >
              {row.level}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-luma-navy/75">
        <span className="font-semibold text-luma-navy">Dominant allergens:</span>{" "}
        {data.dominantAllergens.join(", ")}
      </p>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Tree" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Grass" stroke="#d97706" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Weed" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm text-luma-navy/80 leading-relaxed">
        {data.providerNote}
      </p>
    </section>
  );
}
