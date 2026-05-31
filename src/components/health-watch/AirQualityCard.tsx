import { Wind } from "lucide-react";
import { format } from "date-fns";
import type { AirQuality } from "@/types/health-watch";
import { cardClasses } from "./badgeStyles";
import StaleBadge from "./StaleBadge";

function aqiBadgeClasses(aqi: number): string {
  if (aqi <= 50) return "bg-luma-sage/15 text-luma-sage-hover border-luma-sage/40";
  if (aqi <= 100) return "bg-luma-sun/20 text-[#7a5a25] border-luma-sun/50";
  if (aqi <= 150) return "bg-luma-sun/30 text-[#7a5a25] border-luma-sun/60";
  return "bg-luma-coral/15 text-[#a72d31] border-luma-coral/40";
}

export default function AirQualityCard({ data }: { data: AirQuality }) {
  return (
    <section className={cardClasses()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luma-navy/10 text-luma-navy">
            <Wind size={20} aria-hidden />
          </div>
          <div>
            <h3 className="section-title">
              Air quality
            </h3>
            <p className="text-xs text-luma-muted">Source: {data.source}</p>
          </div>
        </div>
        <StaleBadge meta={data} />
      </div>

      <div className="mt-5 flex items-end gap-3">
        <span className="text-4xl font-bold text-luma-navy leading-none">
          {data.currentAqi}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${aqiBadgeClasses(data.currentAqi)}`}
        >
          {data.category}
        </span>
      </div>
      <p className="mt-1 text-sm text-luma-navy/75">
        Primary pollutant: {data.primaryPollutant}
      </p>

      <div className="mt-5">
        <h4 className="text-xs font-semibold text-luma-navy uppercase tracking-wide">
          3-day forecast
        </h4>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {data.forecast.map((f) => (
            <div
              key={f.date}
              className="rounded-lg border border-luma-border bg-luma-cream-muted/50 px-2 py-2 text-center"
            >
              <div className="text-xs text-luma-muted">
                {format(new Date(f.date), "EEE")}
              </div>
              <div className="text-lg font-semibold text-luma-navy">
                {f.aqi}
              </div>
              <div className="text-[10px] text-luma-muted">{f.category}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-luma-navy/80 leading-relaxed">
        {data.providerNote}
      </p>
    </section>
  );
}
