import { ShieldCheck } from "lucide-react";
import type { VaccinePreventableSection } from "@/types/health-watch";
import { cardClasses, vpdStatusClasses } from "./badgeStyles";
import StaleBadge from "./StaleBadge";

const trendLabel: Record<string, string> = {
  Rising: "↑ Rising",
  Stable: "→ Stable",
  Decreasing: "↓ Decreasing",
};

export default function VaccinePreventableCard({
  data,
}: {
  data: VaccinePreventableSection;
}) {
  const items = data.items;
  return (
    <section className={cardClasses()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-luma-navy/10 text-luma-navy">
            <ShieldCheck size={20} aria-hidden />
          </div>
          <div>
            <h3 className="section-title">
              Vaccine-preventable disease watch
            </h3>
            <p className="text-xs text-slate-500">Source: {data.source}</p>
          </div>
        </div>
        <StaleBadge meta={data} />
      </div>

      {/* Desktop table */}
      <div className="mt-5 hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">Disease</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Recent cases</th>
              <th className="py-2 pr-3 font-semibold">Trend</th>
              <th className="py-2 pr-3 font-semibold">Vaccine relevance</th>
              <th className="py-2 pr-3 font-semibold">Suggested action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr
                key={v.diseaseName}
                className="border-b border-slate-100 last:border-b-0 align-top"
              >
                <td className="py-3 pr-3 font-medium text-luma-navy">
                  {v.diseaseName}
                  <div className="text-xs text-slate-500 font-normal">
                    {v.geography}
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${vpdStatusClasses(v.status)}`}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="py-3 pr-3 text-slate-700 tabular-nums">
                  {v.recentCases}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {trendLabel[v.trend] ?? v.trend}
                </td>
                <td className="py-3 pr-3 text-slate-700">
                  {v.vaccineRelevance}
                </td>
                <td className="py-3 pr-3 text-slate-700">
                  {v.suggestedProviderAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="mt-5 md:hidden space-y-3">
        {items.map((v) => (
          <div
            key={v.diseaseName}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-luma-navy">
                  {v.diseaseName}
                </div>
                <div className="text-xs text-slate-500">{v.geography}</div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${vpdStatusClasses(v.status)}`}
              >
                {v.status}
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">Recent cases:</span> {v.recentCases}{" "}
              · {trendLabel[v.trend] ?? v.trend}
            </div>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-semibold">Vaccine relevance: </span>
              {v.vaccineRelevance}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-semibold">Suggested action: </span>
              {v.suggestedProviderAction}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
        State-level surveillance signal. ZIP-level outbreak detail is generally
        not published publicly; coordinate with your local health department for
        confirmed exposures or cluster reports.
      </p>
    </section>
  );
}
