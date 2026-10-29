import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import { Alert, Badge } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import { platformLabel } from "@/lib/post-rules";
import { summarizePublish } from "@/lib/post-actions";

const STATUS = {
  published: { tone: "success", label: "Published", icon: CheckCircle2 },
  failed: { tone: "danger", label: "Failed", icon: XCircle },
  publishing: { tone: "warning", label: "Publishing", icon: Clock },
  pending: { tone: "neutral", label: "Pending", icon: CircleDashed },
};

export function PublicationList({ items = [], missingPlatforms = [] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {items.map((p) => {
        const meta = STATUS[p.status] || STATUS.pending;
        const Icon = meta.icon;
        return (
          <li key={p.id || p._id || `${p.platform}-${p.socialAccountId}`} className="flex items-start gap-3 p-3">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${p.status === "published" ? "text-emerald-600" : p.status === "failed" ? "text-red-600" : "text-muted"}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{platformLabel(p.platform)}</span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              {p.status === "published" && p.publishedAt && (
                <p className="mt-0.5 text-xs text-muted">Published {formatDateTime(p.publishedAt)}</p>
              )}
              {p.status === "failed" && (
                <p className="mt-1 break-words text-sm text-red-700">
                  {p.errorMessage || "The platform rejected this post."}
                  {p.errorCode && <span className="text-xs text-red-700/70"> (code {p.errorCode})</span>}
                </p>
              )}
              {typeof p.attemptCount === "number" && p.attemptCount > 0 && (
                <p className="mt-0.5 text-xs text-muted">Attempts: {p.attemptCount}</p>
              )}
            </div>
          </li>
        );
      })}
      {missingPlatforms.map((platform) => (
        <li key={`missing-${platform}`} className="flex items-start gap-3 p-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{platformLabel(platform)}</span>
              <Badge>Skipped</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted">No connected {platformLabel(platform)} account for this business. Connect one on the Social accounts page.</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PublishOutcome({ result }) {
  const summary = summarizePublish(result);
  return (
    <div className="space-y-3">
      <Alert tone={summary.tone} title={summary.title}>
        {summary.tone === "warning" && "Some platforms succeeded and others didn't. Successful platforms won't be posted to again if you retry."}
        {summary.tone === "danger" && "Nothing was published. Review the reasons below, fix the problem and retry."}
        {result.note}
      </Alert>
      <PublicationList items={result.items} missingPlatforms={result.missingPlatforms} />
    </div>
  );
}
