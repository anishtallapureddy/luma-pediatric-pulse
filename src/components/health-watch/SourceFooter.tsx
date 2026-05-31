import { Info } from "lucide-react";
import { cardClasses } from "./badgeStyles";

export default function SourceFooter({ sources }: { sources: string[] }) {
  return (
    <section className={cardClasses()}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-luma-cream-muted text-luma-navy/75">
          <Info size={20} aria-hidden />
        </div>
        <h3 className="section-title">
          Sources &amp; disclaimer
        </h3>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-luma-muted">
          Data sources
        </h4>
        <ul className="mt-2 list-disc list-inside text-sm text-luma-navy/80 space-y-1">
          {sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <p className="mt-5 text-xs text-luma-muted leading-relaxed">
        Internal operational dashboard for Luma Pediatrics. Public health data
        is used for awareness and planning only. Clinical decisions should be
        based on provider judgment and patient-specific evaluation. Do not use
        this dashboard as a diagnosis tool.
      </p>
    </section>
  );
}
