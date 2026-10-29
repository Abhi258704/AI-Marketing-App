import { Badge } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { titleCase } from "@/lib/format";

export const PRIORITY_TONE = { high: "danger", medium: "warning", low: "neutral" };
export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export const PriorityBadge = ({ priority }) => (
  <Badge tone={PRIORITY_TONE[priority] || "neutral"}>{titleCase(priority || "medium")} priority</Badge>
);

export const CategoryBadge = ({ category }) => <Badge tone="info">{titleCase(category || "general")}</Badge>;

/** A score of null means "not assessed", never zero. */
export function ScoreCard({ label, score, note, emphasis = false }) {
  const assessed = typeof score === "number";
  const tone = !assessed ? "text-muted" : score >= 80 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-red-700";
  const bar = !assessed ? "" : score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className={cn("rounded-xl border bg-surface p-4", emphasis ? "border-brand-200 ring-1 ring-brand-100" : "border-line")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {assessed ? (
        <>
          <p className={cn("mt-2 text-3xl font-semibold tabular-nums", tone)}>
            {score}<span className="text-base font-normal text-muted">/100</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} score`}>
            <div className={cn("h-full rounded-full", bar)} style={{ width: `${score}%` }} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-lg font-medium text-muted">Not assessed</p>
      )}
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}
