import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { SourceMeta } from "@/types/health-watch";

export default function StaleBadge({ meta }: { meta: SourceMeta }) {
  if (!meta.stale) return null;
  const since = meta.staleSince
    ? format(new Date(meta.staleSince), "PP")
    : "earlier snapshot";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200"
      title={meta.error ?? "Source did not refresh today"}
    >
      <AlertTriangle size={11} aria-hidden />
      Stale since {since}
    </span>
  );
}
