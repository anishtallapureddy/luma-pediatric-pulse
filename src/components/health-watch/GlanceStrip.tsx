import {
  Wind,
  Flower2,
  Activity,
  ShieldCheck,
  Pill,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import type {
  ProviderHealthWatchData,
  SignalLevel,
  TrendDirection,
} from "@/types/health-watch";

type Tone = "ok" | "warn" | "alert" | "info";

interface Tile {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  icon: React.ReactNode;
  trend?: TrendDirection;
  href: string;
}

const toneAccent: Record<Tone, string> = {
  ok: "border-l-luma-sage",
  warn: "border-l-luma-sun",
  alert: "border-l-luma-coral",
  info: "border-l-luma-navy",
};

const toneIconBg: Record<Tone, string> = {
  ok: "bg-luma-sage/15 text-luma-sage-hover",
  warn: "bg-luma-sun/20 text-[#7a5a25]",
  alert: "bg-luma-coral/15 text-[#a72d31]",
  info: "bg-luma-navy/10 text-luma-navy",
};

function signalTone(level: SignalLevel): Tone {
  if (level === "High" || level === "Very High") return "alert";
  if (level === "Moderate") return "warn";
  if (level === "Unknown") return "info";
  return "ok";
}

function aqiTone(aqi: number): Tone {
  if (aqi > 150) return "alert";
  if (aqi > 100) return "alert";
  if (aqi > 50) return "warn";
  return "ok";
}

function trendIcon(t: TrendDirection) {
  if (t === "Rising")
    return <ArrowUpRight size={14} className="text-luma-coral" aria-label="Rising" />;
  if (t === "Decreasing")
    return <ArrowDownRight size={14} className="text-luma-sage-hover" aria-label="Decreasing" />;
  return <Minus size={14} className="text-luma-muted" aria-label="Stable" />;
}

export default function GlanceStrip({
  data,
}: {
  data: ProviderHealthWatchData;
}) {
  const pollenPeak: SignalLevel = (
    [data.pollen.treeLevel, data.pollen.grassLevel, data.pollen.weedLevel] as SignalLevel[]
  ).reduce<SignalLevel>((max, lvl) => {
    const rank = (l: SignalLevel) =>
      ({ Unknown: -1, Low: 0, Moderate: 1, High: 2, "Very High": 3 })[l] ?? -1;
    return rank(lvl) > rank(max) ? lvl : max;
  }, "Low");

  const respiratoryTrend = data.respiratoryIllness.edRespiratoryVisitTrend;
  const respiratoryTone: Tone =
    respiratoryTrend === "Rising"
      ? "alert"
      : signalTone(data.respiratoryIllness.rsvLevel) === "alert"
        ? "alert"
        : signalTone(data.respiratoryIllness.rsvLevel) === "warn"
          ? "warn"
          : "ok";

  const vpdItems = data.vaccinePreventable?.items ?? [];
  const vpdActive = vpdItems.filter((v) => v.status === "Active outbreak").length;
  const vpdWatch = vpdItems.filter((v) => v.status === "Outbreak watch").length;
  const vpdTone: Tone =
    vpdActive > 0 ? "alert" : vpdWatch > 0 ? "warn" : "ok";
  const vpdValue =
    vpdActive > 0
      ? `${vpdActive} active`
      : vpdWatch > 0
        ? `${vpdWatch} watch`
        : "All clear";
  const vpdSub =
    vpdActive > 0
      ? "Active outbreak — verify vaccines"
      : vpdWatch > 0
        ? "Watch — confirm vax status"
        : "No active VPD outbreak signals";

  const constrained = data.drugShortages.items.filter(
    (d) => d.status === "Shortage" || d.status === "Limited",
  );
  const drugTone: Tone =
    constrained.some((d) => d.status === "Shortage")
      ? "alert"
      : constrained.length > 0
        ? "warn"
        : "ok";

  const tiles: Tile[] = [
    {
      label: "Air quality",
      value: `AQI ${data.airQuality.currentAqi}`,
      sub: `${data.airQuality.category} · ${data.airQuality.primaryPollutant}`,
      tone: aqiTone(data.airQuality.currentAqi),
      icon: <Wind size={18} aria-hidden />,
      href: "#air-quality",
    },
    {
      label: "Pollen peak",
      value: pollenPeak,
      sub: data.pollen.dominantAllergens.slice(0, 2).join(", ") || "—",
      tone: signalTone(pollenPeak),
      icon: <Flower2 size={18} aria-hidden />,
      href: "#pollen",
    },
    {
      label: "Respiratory",
      value: `RSV ${data.respiratoryIllness.rsvLevel}`,
      sub: `ED visits ${respiratoryTrend.toLowerCase()}`,
      tone: respiratoryTone,
      trend: respiratoryTrend,
      icon: <Activity size={18} aria-hidden />,
      href: "#respiratory",
    },
    {
      label: "Vaccines",
      value: vpdValue,
      sub: vpdSub,
      tone: vpdTone,
      icon: <ShieldCheck size={18} aria-hidden />,
      href: "#vaccines",
    },
    {
      label: "Medications",
      value:
        constrained.length === 0
          ? "All available"
          : `${constrained.length} constrained`,
      sub:
        constrained.length === 0
          ? "No shortage signals"
          : constrained.slice(0, 2).map((d) => d.drugName.split(" ")[0]).join(", "),
      tone: drugTone,
      icon: <Pill size={18} aria-hidden />,
      href: "#medications",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {tiles.map((t) => (
        <a
          key={t.label}
          href={t.href}
          aria-label={`${t.label}: ${t.value}. ${t.sub}. Jump to section.`}
          className={`group block bg-luma-cream-card border border-luma-border rounded-2xl shadow-soft p-4 border-l-[5px] ${toneAccent[t.tone]} transition-all duration-150 hover:shadow-elevated hover:-translate-y-0.5 hover:border-luma-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luma-navy focus-visible:ring-offset-2 focus-visible:ring-offset-luma-cream`}
        >
          <div className="flex items-center justify-between">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneIconBg[t.tone]}`}>
              {t.icon}
            </span>
            <span className="flex items-center gap-1">
              {t.trend && trendIcon(t.trend)}
              <ArrowUpRight
                size={14}
                className="text-luma-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 transition-all"
                aria-hidden
              />
            </span>
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-luma-muted font-semibold whitespace-nowrap">
            {t.label}
          </div>
          <div className="mt-1 text-[20px] font-semibold text-luma-navy leading-tight tracking-tight truncate">
            {t.value}
          </div>
          <div className="mt-1 text-xs text-luma-navy/65 leading-snug line-clamp-2">
            {t.sub}
          </div>
        </a>
      ))}
    </div>
  );
}
