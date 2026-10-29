"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, ListChecks, Play, RotateCcw } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { PRIORITY_ORDER, PriorityBadge } from "@/components/audits/audit-parts";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Badge, CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import { listAuditRecommendations, updateRecommendationStatus } from "@/lib/api/recommendations";
import { getErrorMessage } from "@/lib/api/client";
import { getAuditHistory } from "@/lib/local-store";
import { formatDateTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";

const STATUS_TONE = { pending: "neutral", in_progress: "info", completed: "success" };
const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function RecommendationItem({ rec, onChange, busy }) {
  const { status } = rec;
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={cn("text-sm font-semibold", status === "completed" && "text-muted line-through decoration-1")}>{rec.title}</h3>
        <PriorityBadge priority={rec.priority} />
        <Badge tone={STATUS_TONE[status]}>{titleCase(status)}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted">{rec.description}</p>
      <div className="flex flex-wrap items-center gap-2">
        {status === "pending" && <Button size="sm" variant="secondary" loading={busy === "in_progress"} disabled={Boolean(busy)} onClick={() => onChange(rec, "in_progress")}><Play className="h-3.5 w-3.5" aria-hidden /> Start</Button>}
        {status !== "completed" && <Button size="sm" loading={busy === "completed"} disabled={Boolean(busy)} onClick={() => onChange(rec, "completed")}>Mark completed</Button>}
        {status !== "pending" && <Button size="sm" variant="ghost" loading={busy === "pending"} disabled={Boolean(busy)} onClick={() => onChange(rec, "pending")}><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reopen as pending</Button>}
        {status === "completed" && rec.completedAt && <span className="text-xs text-muted">Completed {formatDateTime(rec.completedAt)}</span>}
      </div>
    </li>
  );
}

function RecommendationsContent({ business }) {
  const { user } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const history = useMemo(() => getAuditHistory(user.id, business._id), [user.id, business._id]);
  const requested = params.get("audit");
  const initial = history.find((a) => a._id === requested)?._id || history[0]?._id || "";
  const [auditId, setAuditId] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [priority, setPriority] = useState("all");
  const [busy, setBusy] = useState({}); // id -> target status

  const { data, loading, error, reload, mutate } = useApi(
    () => listAuditRecommendations(auditId),
    [auditId],
    { enabled: Boolean(auditId) }
  );
  const recs = useMemo(() => data?.recommendations || [], [data]);

  const visible = useMemo(
    () =>
      recs
        .filter((r) => (filter === "all" || r.status === filter) && (priority === "all" || r.priority === priority))
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)),
    [recs, filter, priority]
  );

  const done = recs.filter((r) => r.status === "completed").length;

  async function change(rec, status) {
    setBusy((b) => ({ ...b, [rec._id]: status }));
    try {
      const res = await updateRecommendationStatus(rec._id, status);
      // Use the server's version of the record (includes completedAt).
      mutate((d) => ({ ...d, recommendations: d.recommendations.map((r) => (r._id === rec._id ? res.recommendation : r)) }));
      toast.success(status === "completed" ? "Marked as completed" : status === "in_progress" ? "Marked as in progress" : "Reopened as pending");
    } catch (e) {
      toast.error("Couldn't update recommendation", { message: getErrorMessage(e) });
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[rec._id]; return n; });
    }
  }

  return (
    <>
      <PageHeader title="Recommendations" description={`Action items from ${business.name}'s audits. Track your progress here.`} />

      {history.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Run an audit to get recommendations"
          description="Recommendations are created by audits. Audits you run in this browser appear here."
          action={<ButtonLink href="/audits">Go to audits</ButtonLink>}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Select label="Audit" value={auditId} onChange={(e) => { setAuditId(e.target.value); setFilter("all"); }}>
              {history.map((a) => <option key={a._id} value={a._id}>{formatDateTime(a.createdAt)} · score {a.profileScore ?? "–"}</option>)}
            </Select>
            <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </Select>
          </div>

          {loading && !data && <CardSkeleton lines={5} />}
          {error && <ErrorState error={error} onRetry={reload} title="Couldn't load recommendations" />}

          {data && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by status">
                  {FILTERS.map((f) => (
                    <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium", filter === f.id ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface hover:bg-sunken")}>
                      {f.label} <span className="tabular-nums opacity-70">{f.id === "all" ? recs.length : recs.filter((r) => r.status === f.id).length}</span>
                    </button>
                  ))}
                </div>
                {recs.length > 0 && <p className="text-sm text-muted">{done} of {recs.length} completed</p>}
              </div>
              {recs.length > 0 && (
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={recs.length} aria-label="Recommendations completed">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / recs.length) * 100}%` }} />
                </div>
              )}

              {visible.length === 0 ? (
                <EmptyState icon={ListChecks} title={recs.length === 0 ? "This audit has no recommendations" : "Nothing matches these filters"} description={recs.length === 0 ? "The audit didn't produce any action items." : "Try another status or priority."} />
              ) : (
                <Card><ul className="divide-y divide-line">{visible.map((r) => <RecommendationItem key={r._id} rec={r} busy={busy[r._id]} onChange={change} />)}</ul></Card>
              )}
            </>
          )}
        </>
      )}
      <p className="mt-6 text-xs text-muted">Recommendations are AI-generated suggestions based on your profile details. Treat them as starting points.</p>
      {history.length > 0 && <p className="mt-1 text-xs"><Link href="/audits" className="font-medium text-brand-700 hover:underline">Back to audits</Link></p>}
    </>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<CardSkeleton lines={5} />}>
      <RequireBusiness>{(business) => <RecommendationsContent key={business._id} business={business} />}</RequireBusiness>
    </Suspense>
  );
}
