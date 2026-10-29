"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, Bell, CalendarClock, ClipboardCheck, FileText, Link2, Sparkles } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { PlatformBadges, PostStatusBadge } from "@/components/posts/post-badges";
import { usePublicationRecords } from "@/components/posts/use-publication-record";
import { PriorityBadge, PRIORITY_ORDER } from "@/components/audits/audit-parts";
import { useAuth } from "@/components/providers/auth-provider";
import { useNotifications } from "@/components/providers/notifications-provider";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { Badge, Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import { listPosts } from "@/lib/api/posts";
import { listSocialAccounts } from "@/lib/api/social-accounts";
import { getAnalytics } from "@/lib/api/analytics";
import { listAuditRecommendations } from "@/lib/api/recommendations";
import { effectiveStatus } from "@/lib/post-rules";
import { getAuditHistory } from "@/lib/local-store";
import { FACEBOOK_METRICS, INSTAGRAM_METRICS, instagramWindows, latestFacebookValue, splitBySource } from "@/lib/analytics";
import { daysAgoInput } from "@/lib/datetime";
import { formatDateTime, formatNumber, formatUtcDate, truncate } from "@/lib/format";

const QUICK_ACTIONS = [
  { href: "/content-studio", label: "Generate content", icon: Sparkles },
  { href: "/posts/new", label: "Create a post", icon: FileText },
  { href: "/calendar", label: "Schedule a post", icon: CalendarClock },
  { href: "/social-accounts", label: "Connect accounts", icon: Link2 },
  { href: "/audits", label: "Run an audit", icon: ClipboardCheck },
];

function connectionOf(accounts, platform) {
  const list = accounts.filter((a) => a.platform === platform);
  const ok = list.find((a) => a.status === "connected" && !(a.tokenExpiresAt && new Date(a.tokenExpiresAt) <= new Date()));
  if (ok) return { tone: "success", label: "Connected", detail: ok.accountName };
  if (list.length) return { tone: "danger", label: "Needs reconnecting", detail: list[0].accountName };
  return { tone: "neutral", label: "Not connected" };
}

function SectionError({ error, onRetry }) {
  return (
    <p className="text-sm text-red-700">
      {error.message}{" "}
      <button type="button" className="font-medium underline" onClick={onRetry}>Retry</button>
    </p>
  );
}

function DashboardContent({ business }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const accounts = useApi(() => listSocialAccounts(business._id), [business._id]);
  const postsRes = useApi(() => listPosts(), []);
  const analytics = useApi(() => getAnalytics(business._id, { from: `${daysAgoInput(29)}T00:00:00.000Z` }), [business._id]);

  const latestAudit = useMemo(() => getAuditHistory(user.id, business._id)[0] || null, [user.id, business._id]);
  const recs = useApi(() => listAuditRecommendations(latestAudit._id), [latestAudit?._id], { enabled: Boolean(latestAudit) });

  const posts = useMemo(() => (postsRes.data?.posts || []).filter((p) => p.businessId === business._id), [postsRes.data, business._id]);
  const records = usePublicationRecords(posts);
  const withStatus = useMemo(() => posts.map((p) => ({ ...p, eff: effectiveStatus(p, records[p._id]) })), [posts, records]);

  const recent = withStatus.slice(0, 5);
  const upcoming = withStatus
    .filter((p) => p.eff.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5);

  const accountList = accounts.data?.socialAccounts || [];
  const fb = connectionOf(accountList, "facebook");
  const ig = connectionOf(accountList, "instagram");

  const { facebook, instagram } = splitBySource(analytics.data?.analytics || []);
  const igLatest = instagramWindows(instagram)[0];

  const openRecs = (recs.data?.recommendations || [])
    .filter((r) => r.status !== "completed")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  const highOpen = openRecs.filter((r) => r.priority === "high").length;

  return (
    <>
      <PageHeader eyebrow={business.category || "Business"} title={business.name} description={`Welcome back, ${user.name?.split(" ")[0] || "there"}. Here's where things stand.`} />

      <div className="mb-8 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }, i) => (
          <ButtonLink key={href} href={href} variant={i === 0 ? "primary" : "secondary"} size="sm"><Icon className="h-4 w-4" aria-hidden /> {label}</ButtonLink>
        ))}
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Facebook", fb], ["Instagram", ig]].map(([name, c]) => (
          <Stat key={name} label={name} value={accounts.loading && !accounts.data ? "…" : c.label} hint={accounts.error ? "Couldn't check" : c.detail || undefined}>
            {!accounts.loading && <Badge tone={c.tone} className="mt-2">{c.label}</Badge>}
          </Stat>
        ))}
        <Link href="/notifications" className="block rounded-xl transition-shadow hover:shadow-md">
          <Stat label="Unread notifications" value={formatNumber(unreadCount)} icon={Bell} hint="View all" />
        </Link>
        <Link href="/audits" className="block rounded-xl transition-shadow hover:shadow-md">
          <Stat
            label="Latest profile audit"
            value={latestAudit ? `${latestAudit.profileScore ?? "–"}/100` : "No audit yet"}
            icon={ClipboardCheck}
            hint={latestAudit ? `AI-generated · ${formatDateTime(latestAudit.createdAt)}` : "Run one to get a score"}
          />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent posts" action={<Link href="/posts" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>} />
          {postsRes.loading && !postsRes.data ? <CardBody className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></CardBody>
            : postsRes.error ? <CardBody><SectionError error={postsRes.error} onRetry={postsRes.reload} /></CardBody>
            : recent.length === 0 ? <CardBody><p className="text-sm text-muted">No posts yet for this business. <Link href="/content-studio" className="font-medium text-brand-700 hover:underline">Generate your first one</Link>.</p></CardBody>
            : (
              <ul className="divide-y divide-line">
                {recent.map((p) => (
                  <li key={p._id}>
                    <Link href={`/posts/${p._id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{p.title || truncate(p.content, 50)}</p><div className="mt-1"><PlatformBadges platforms={p.platforms} /></div></div>
                      <PostStatusBadge status={p.eff.status} derived={p.eff.derived} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card>
          <CardHeader title="Upcoming scheduled" action={<Link href="/calendar" className="text-sm font-medium text-brand-700 hover:underline">Calendar</Link>} />
          {postsRes.loading && !postsRes.data ? <CardBody className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></CardBody>
            : postsRes.error ? <CardBody><SectionError error={postsRes.error} onRetry={postsRes.reload} /></CardBody>
            : upcoming.length === 0 ? <CardBody><p className="text-sm text-muted">Nothing is scheduled. <Link href="/posts" className="font-medium text-brand-700 hover:underline">Schedule a draft</Link>.</p></CardBody>
            : (
              <ul className="divide-y divide-line">
                {upcoming.map((p) => (
                  <li key={p._id}>
                    <Link href={`/posts/${p._id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{p.title || truncate(p.content, 50)}</p><p className="text-xs text-muted">{formatDateTime(p.scheduledAt)}</p></div>
                      <PlatformBadges platforms={p.platforms} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card>
          <CardHeader title="Recommendations" description={latestAudit ? `${openRecs.length} open${highOpen ? ` · ${highOpen} high priority` : ""}` : undefined} action={<Link href="/recommendations" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>} />
          {!latestAudit ? <CardBody><p className="text-sm text-muted">Run a business audit to get recommendations. <Link href="/audits" className="font-medium text-brand-700 hover:underline">Run audit</Link></p></CardBody>
            : recs.loading && !recs.data ? <CardBody className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></CardBody>
            : recs.error ? <CardBody><SectionError error={recs.error} onRetry={recs.reload} /></CardBody>
            : openRecs.length === 0 ? <CardBody><p className="text-sm text-muted">All recommendations from your latest audit are completed.</p></CardBody>
            : (
              <ul className="divide-y divide-line">
                {openRecs.slice(0, 4).map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <p className="min-w-0 truncate text-sm font-medium">{r.title}</p><PriorityBadge priority={r.priority} />
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card>
          <CardHeader title="Analytics, last 30 days" action={<Link href="/analytics" className="text-sm font-medium text-brand-700 hover:underline">Details</Link>} />
          {analytics.loading && !analytics.data ? <CardBody className="space-y-3"><Skeleton className="h-16" /></CardBody>
            : analytics.error ? <CardBody><SectionError error={analytics.error} onRetry={analytics.reload} /></CardBody>
            : facebook.length === 0 && !igLatest ? (
              <CardBody><div className="flex items-start gap-3 text-sm text-muted"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p>No analytics stored yet. <Link href="/analytics" className="font-medium text-brand-700 hover:underline">Sync a connected platform</Link> to see numbers here.</p></div></CardBody>
            ) : (
              <CardBody className="space-y-5">
                {facebook.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Facebook · latest day</p>
                    <dl className="grid grid-cols-2 gap-3">
                      {FACEBOOK_METRICS.map((m) => { const v = latestFacebookValue(facebook, m.id); return <div key={m.id}><dt className="text-xs text-muted">{m.label}</dt><dd className="text-lg font-semibold tabular-nums">{v ? formatNumber(v.value) : "—"}</dd></div>; })}
                    </dl>
                  </div>
                )}
                {igLatest && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Instagram · 7-day window to {formatUtcDate(igLatest.periodEnd)}</p>
                    <dl className="grid grid-cols-2 gap-3">
                      {INSTAGRAM_METRICS.map((m) => <div key={m.id}><dt className="text-xs text-muted">{m.label}</dt><dd className="text-lg font-semibold tabular-nums">{formatNumber(igLatest.values[m.id])}</dd></div>)}
                    </dl>
                  </div>
                )}
              </CardBody>
            )}
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return <RequireBusiness>{(business) => <DashboardContent key={business._id} business={business} />}</RequireBusiness>;
}
