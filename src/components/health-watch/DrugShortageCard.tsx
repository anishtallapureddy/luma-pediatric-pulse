import { Pill } from "lucide-react";
import type { DrugShortagesSection } from "@/types/health-watch";
import { cardClasses, shortageStatusClasses } from "./badgeStyles";
import StaleBadge from "./StaleBadge";

export default function DrugShortageCard({
  data,
}: {
  data: DrugShortagesSection;
}) {
  const shortages = data.items;
  return (
    <section className={cardClasses()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luma-coral/15 text-[#a72d31]">
            <Pill size={20} aria-hidden />
          </div>
          <div>
            <h3 className="section-title">
              Pediatric medication watchlist
            </h3>
            <p className="text-xs text-luma-muted">Source: {data.source}</p>
          </div>
        </div>
        <StaleBadge meta={data} />
      </div>

      {/* Desktop table */}
      <div className="mt-5 hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-luma-muted border-b border-luma-border">
              <th className="py-2 pr-3 font-semibold">Drug</th>
              <th className="py-2 pr-3 font-semibold">Category</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Pediatric relevance</th>
              <th className="py-2 pr-3 font-semibold">Suggested action</th>
            </tr>
          </thead>
          <tbody>
            {shortages.map((d) => (
              <tr
                key={d.drugName}
                className="border-b border-luma-border/60 last:border-b-0 align-top"
              >
                <td className="py-3 pr-3 font-medium text-luma-navy">
                  {d.drugName}
                </td>
                <td className="py-3 pr-3 text-luma-navy/75">{d.category}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${shortageStatusClasses(d.status)}`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="py-3 pr-3 text-luma-navy/80">
                  {d.pediatricRelevance}
                </td>
                <td className="py-3 pr-3 text-luma-navy/80">
                  {d.suggestedProviderAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="mt-5 md:hidden space-y-3">
        {shortages.map((d) => (
          <div
            key={d.drugName}
            className="rounded-lg border border-luma-border bg-luma-cream-muted/50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-luma-navy">{d.drugName}</div>
                <div className="text-xs text-luma-muted">{d.category}</div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${shortageStatusClasses(d.status)}`}
              >
                {d.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-luma-navy/80">
              <span className="font-semibold">Pediatric relevance: </span>
              {d.pediatricRelevance}
            </p>
            <p className="mt-1 text-sm text-luma-navy/80">
              <span className="font-semibold">Suggested action: </span>
              {d.suggestedProviderAction}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-luma-muted leading-relaxed">
        Provider-only reference. Verify with pharmacy or wholesaler reality
        before changing prescribing workflows. This list is informational, not a
        clinical guideline.
      </p>
    </section>
  );
}
