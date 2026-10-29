"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useNotifications } from "@/components/providers/notifications-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge, CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { NOTIFICATION_TONES, notificationTarget } from "@/lib/notification-links";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatRelative, titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { notifications, unreadCount, loaded, error, refresh, markRead, markAllRead, limit, setLimit } = useNotifications();
  const { businesses, selectBusiness } = useBusiness();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const nameOf = (id) => businesses.find((b) => b._id === id)?.name;
  const list = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  async function guarded(fn, failTitle) {
    try {
      await fn();
    } catch (e) {
      toast.error(failTitle, { message: getErrorMessage(e) });
    }
  }

  async function open(n) {
    if (!n.isRead) await guarded(() => markRead(n._id), "Couldn't mark as read");
    if (n.businessId && businesses.some((b) => b._id === n.businessId)) selectBusiness(n.businessId);
    const target = notificationTarget(n);
    if (target) router.push(target.href);
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your posts, audits and recommendations. This page refreshes when you open it and about once a minute."
        actions={
          <>
            <Button variant="secondary" onClick={refresh}>Refresh</Button>
            <Button variant="secondary" disabled={unreadCount === 0} loading={busy} onClick={async () => { setBusy(true); await guarded(markAllRead, "Couldn't mark all as read"); setBusy(false); }}>
              <CheckCheck className="h-4 w-4" aria-hidden /> Mark all as read
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-1.5" role="tablist" aria-label="Filter notifications">
        {[["all", "All"], ["unread", `Unread (${unreadCount})`]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", filter === id ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface hover:bg-sunken")}>{label}</button>
        ))}
      </div>

      {!loaded && <CardSkeleton lines={4} />}
      {error && !notifications.length && <ErrorState error={error} onRetry={refresh} title="Couldn't load notifications" />}

      {loaded && !error && list.length === 0 && (
        <EmptyState icon={Bell} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} description="You'll see updates here when posts publish or fail, audits finish and recommendations are completed." />
      )}

      {list.length > 0 && (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((n) => {
              const target = notificationTarget(n);
              return (
                <li key={n._id} className={cn("flex items-start gap-3 px-5 py-4", !n.isRead && "bg-brand-50/50")}>
                  <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-brand-600")} aria-label={n.isRead ? undefined : "Unread"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={cn("text-sm", n.isRead ? "font-medium" : "font-semibold")}>{n.title}</h2>
                      <Badge tone={NOTIFICATION_TONES[n.type] || "neutral"}>{titleCase(n.type)}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                    <p className="mt-1 text-xs text-muted" title={formatDateTime(n.createdAt)}>
                      {formatRelative(n.createdAt)}{nameOf(n.businessId) ? ` · ${nameOf(n.businessId)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                    {target && <Button size="sm" variant="secondary" onClick={() => open(n)}>{target.label}</Button>}
                    {!n.isRead && <Button size="sm" variant="ghost" onClick={() => guarded(() => markRead(n._id), "Couldn't mark as read")}>Mark read</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {loaded && notifications.length >= limit && limit < 100 && (
        <div className="mt-4 text-center"><Button variant="secondary" onClick={() => setLimit(Math.min(100, limit + 30))}>Load more</Button></div>
      )}
    </>
  );
}
