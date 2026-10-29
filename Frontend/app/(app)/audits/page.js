"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardCheck, ListChecks, Play, RefreshCw } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { CategoryBadge, PRIORITY_ORDER, PriorityBadge, ScoreCard } from "@/components/audits/audit-parts";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { runBusinessAudit } from "@/lib/api/ai";
import { getErrorMessage } from "@/lib/api/client";
import { getAuditHistory, saveAudit } from "@/lib/local-store";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

function AuditsContent({ business }) {
  const { user } = useAuth();
  const toast = useToast();
  const [history, setHistory] = useState(() => getAuditHistory(user.id, business._id));
  const [viewId, setViewId] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [filter, setFilter] = useState("all");

  const audit = history.find((a) => a._id === viewId) || history[0] || null;

  const issues = useMemo(() => {
    const list = [...(audit?.issues || [])].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
    return filter === "all" ? list : list.filter((i) => i.priority === filter);
  }, [audit, filter]);

  async function run() {
    setConfirm(false);
    setRunning(true);
    setError(null);
    try {
      const res = await runBusinessAudit(business._id);
      if (!res.audit?._id) throw new Error("The server returned an unexpected response.");
      const stored = { ...res.audit, recommendationCount: res.recommendations?.length ?? 0 };
      saveAudit(user.id, business._id, stored);
      setHistory(getAuditHistory(user.id, business._id));
      setViewId(stored._id);
      toast.success("Audit completed", { message: `${res.recommendations?.length || 0} recommendations were created.` });
    } catch (e) {
      setError(getErrorMessage(e, "The audit couldn't be completed."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Business audit"
        description={`An AI review of ${business.name}'s profile with a prioritised list of improvements.`}
        actions={
          <Button onClick={() => (audit ? setConfirm(true) : run())} loading={running}>
            {audit ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {running ? "Running audit…" : audit ? "Re-run audit" : "Run audit"}
          </Button>
        }
      />

      <Alert tone="info" className="mb-6" title="What this audit covers">
        It assesses only the profile details you entered (name, category, description, contact info, logo). It does <strong>not</strong> check reviews, website SEO, keyword rankings or social performance, so those scores show as &ldquo;Not assessed&rdquo;. Scores are AI-generated and can be wrong.
      </Alert>

      {error && <Alert tone="danger" title="Audit failed" className="mb-6">{error}</Alert>}

      {running && (
        <Card className="mb-6">
          <CardBody className="space-y-3" role="status">
            <p className="text-sm font-medium">Analysing your business profile…</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="skeleton h-full w-full" /></div>
            <p className="text-xs text-muted">This usually takes 10–30 seconds. Please keep this page open.</p>
          </CardBody>
        </Card>
      )}

      {!audit && !running && (
        <EmptyState
          icon={ClipboardCheck}
          title="No audit run from this browser yet"
          description="Run an audit to score your profile and get recommendations. Past audits can't be listed by the API yet, so only audits you run here are shown."
          action={<Button onClick={run}><Play className="h-4 w-4" aria-hidden /> Run audit</Button>}
        />
      )}

      {audit && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm text-muted">Audit from {formatDateTime(audit.createdAt)} · AI-generated</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ScoreCard label="Profile score" score={audit.profileScore} note="Completeness and quality of your profile details." emphasis />
                <ScoreCard label="Overall" score={audit.overallScore} note="Currently equals the profile score. Other areas aren't assessed yet." />
                <ScoreCard label="Reviews" score={audit.reviewScore} note="Needs Google Business Profile access." />
                <ScoreCard label="Content" score={audit.contentScore} />
                <ScoreCard label="SEO" score={audit.seoScore} note="Needs a keyword/ranking data source." />
              </div>
            </div>

            <Card>
              <CardHeader
                title={`Issues found (${audit.issues?.length || 0})`}
                action={
                  <div className="flex gap-1" role="group" aria-label="Filter issues by priority">
                    {["all", "high", "medium", "low"].map((f) => (
                      <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", filter === f ? "bg-brand-700 text-white" : "bg-sunken text-ink/70 hover:bg-line")}>{f}</button>
                    ))}
                  </div>
                }
              />
              {issues.length === 0 ? (
                <CardBody><p className="text-sm text-muted">{audit.issues?.length ? "No issues with this priority." : "The audit didn't flag any issues."}</p></CardBody>
              ) : (
                <ul className="divide-y divide-line">
                  {issues.map((issue, i) => (
                    <li key={`${issue.title}-${i}`} className="space-y-1.5 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{issue.title}</h3>
                        <PriorityBadge priority={issue.priority} /> <CategoryBadge category={issue.category} />
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{issue.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <ButtonLink variant="secondary" href={`/recommendations?audit=${audit._id}`}>
              <ListChecks className="h-4 w-4" aria-hidden /> View recommendations{typeof audit.recommendationCount === "number" ? ` (${audit.recommendationCount})` : ""}
            </ButtonLink>
          </div>

          <aside>
            <Card>
              <CardHeader title="History" description="Audits run in this browser" />
              <ul className="divide-y divide-line">
                {history.map((a) => (
                  <li key={a._id}>
                    <button onClick={() => setViewId(a._id)} aria-current={a._id === audit._id} className={cn("flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm hover:bg-canvas", a._id === audit._id && "bg-brand-50/60")}>
                      <span className="min-w-0 truncate">{formatDateTime(a.createdAt)}</span>
                      <span className="font-semibold tabular-nums">{a.profileScore ?? "–"}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="border-t border-line px-5 py-3 text-xs text-muted">Stored here because the API can&apos;t list past audits yet.</p>
            </Card>
          </aside>
        </div>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={run} title="Run a new audit?" confirmLabel="Run audit">
        <p>This creates a new audit and a fresh set of recommendations. Your previous audit and its recommendation progress are kept.</p>
        <p>Tip: update your business profile first so the new score reflects your changes. <Link href={`/businesses/${business._id}`} className="font-medium text-brand-700 hover:underline">Edit profile</Link></p>
      </ConfirmDialog>
    </>
  );
}

export default function AuditsPage() {
  return <RequireBusiness>{(business) => <AuditsContent key={business._id} business={business} />}</RequireBusiness>;
}
