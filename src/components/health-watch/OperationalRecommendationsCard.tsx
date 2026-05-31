import { CheckCircle2, ClipboardList } from "lucide-react";

export default function OperationalRecommendationsCard({
  recommendations,
}: {
  recommendations: string[];
}) {
  return (
    <section className="bg-luma-navy text-luma-cream rounded-card shadow-elevated p-7 border-l-[6px] border-luma-sun">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-luma-cream/10 text-luma-sun">
          <ClipboardList size={20} aria-hidden />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-luma-sun font-semibold">
            Do this today
          </p>
          <h3 className="font-display text-[24px] sm:text-[28px] text-luma-cream leading-tight">
            Operational playbook
          </h3>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        {recommendations.map((rec) => (
          <li key={rec} className="flex items-start gap-2.5">
            <CheckCircle2
              size={18}
              className="mt-0.5 text-luma-sage-light flex-shrink-0"
              aria-hidden
            />
            <span className="text-sm text-luma-cream/95 leading-relaxed">
              {rec}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 pt-5 border-t border-luma-cream/15 text-xs text-luma-cream/70">
        Built for provider, MA, and front-desk triage decisions — not a
        diagnosis tool.
      </p>
    </section>
  );
}
