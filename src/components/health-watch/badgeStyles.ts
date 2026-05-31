import type {
  RiskLevel,
  SignalLevel,
  DrugShortageStatus,
  VpdStatus,
} from "@/types/health-watch";

/** Brand-tinted palette:
 *   ok    → sage (brand CTA)
 *   warn  → sun gold (brand accent)
 *   alert → coral (brand alert)
 *   info  → navy soft
 *   muted → cream-muted with navy text
 */
const TONE = {
  ok: "bg-luma-sage/15 text-luma-sage-hover border-luma-sage/40",
  warn: "bg-luma-sun/20 text-[#7a5a25] border-luma-sun/50",
  alert: "bg-luma-coral/15 text-[#a72d31] border-luma-coral/40",
  info: "bg-luma-navy/10 text-luma-navy border-luma-navy/25",
  muted: "bg-luma-cream-muted text-luma-navy/70 border-luma-border",
} as const;

export function riskBadgeClasses(level: RiskLevel): string {
  switch (level) {
    case "High":
      return TONE.alert;
    case "Moderate":
      return TONE.warn;
    case "Low":
      return TONE.ok;
  }
}

export function signalBadgeClasses(level: SignalLevel): string {
  switch (level) {
    case "Low":
      return TONE.ok;
    case "Moderate":
      return TONE.warn;
    case "High":
    case "Very High":
      return TONE.alert;
    case "Unknown":
    default:
      return TONE.muted;
  }
}

export function shortageStatusClasses(status: DrugShortageStatus): string {
  switch (status) {
    case "Available":
    case "Resolved":
      return TONE.ok;
    case "Limited":
      return TONE.warn;
    case "Shortage":
      return TONE.alert;
    case "Unknown":
    default:
      return TONE.muted;
  }
}

export function vpdStatusClasses(status: VpdStatus): string {
  switch (status) {
    case "No recent cases":
      return TONE.ok;
    case "Sporadic":
      return TONE.info;
    case "Outbreak watch":
      return TONE.warn;
    case "Active outbreak":
      return TONE.alert;
    case "Unknown":
    default:
      return TONE.muted;
  }
}

export function cardClasses(): string {
  return "bg-luma-cream-card rounded-card border border-luma-border shadow-soft p-6";
}

/** Cards with an accent left border conveying urgency. */
export function cardAccent(level: "ok" | "warn" | "alert" | "info"): string {
  const map: Record<typeof level, string> = {
    ok: "border-l-4 border-l-luma-sage",
    warn: "border-l-4 border-l-luma-sun",
    alert: "border-l-4 border-l-luma-coral",
    info: "border-l-4 border-l-luma-navy",
  };
  return `${cardClasses()} ${map[level]}`;
}
