"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { PostStatusBadge, PlatformBadges } from "@/components/posts/post-badges";
import { usePublicationRecords } from "@/components/posts/use-publication-record";
import { Card, PageHeader } from "@/components/ui/card";
import { ButtonLink, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import { listPosts } from "@/lib/api/posts";
import { POST_STATUSES, PLATFORMS, effectiveStatus } from "@/lib/post-rules";
import { formatDateTime, truncate } from "@/lib/format";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 15;

export default function PostsPage() {
  const { businesses, activeBusinessId } = useBusiness();
  const { data, loading, error, reload } = useApi(() => listPosts(), []);
  const [status, setStatus] = useState("all");
  const [business, setBusiness] = useState("active");
  const [platform, setPlatform] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const posts = useMemo(() => data?.posts || [], [data]);
  const records = usePublicationRecords(posts);
  const nameOf = (id) => businesses.find((b) => b._id === id)?.name || "Disabled business";

  const withStatus = useMemo(
    () => posts.map((p) => ({ ...p, eff: effectiveStatus(p, records[p._id]) })),
    [posts, records]
  );

  const scoped = useMemo(() => {
    const businessId = business === "active" ? activeBusinessId : business;
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    return withStatus.filter((p) => {
      if (business !== "all" && p.businessId !== businessId) return false;
      if (platform !== "all" && !(p.platforms || []).includes(platform)) return false;
      const ref = new Date(p.scheduledAt || p.createdAt);
      if (fromDate && ref < fromDate) return false;
      if (toDate && ref > toDate) return false;
      return true;
    });
  }, [withStatus, business, activeBusinessId, platform, from, to]);

  const counts = useMemo(() => {
    const c = { all: scoped.length };
    for (const s of POST_STATUSES) c[s.id] = scoped.filter((p) => p.eff.status === s.id).length;
    return c;
  }, [scoped]);

  const filtered = status === "all" ? scoped : scoped.filter((p) => p.eff.status === status);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const onFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const hasFilters = status !== "all" || platform !== "all" || from || to || business !== "active";

  return (
    <>
      <PageHeader
        title="Posts"
        description="Drafts, scheduled and published content across your businesses."
        actions={
          <>
            <ButtonLink variant="secondary" href="/calendar"><CalendarDays className="h-4 w-4" aria-hidden /> Calendar</ButtonLink>
            <ButtonLink href="/posts/new"><Plus className="h-4 w-4" aria-hidden /> New post</ButtonLink>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Business" value={business} onChange={onFilter(setBusiness)}>
          <option value="active">Active business</option>
          <option value="all">All businesses</option>
          {businesses.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </Select>
        <Select label="Platform" value={platform} onChange={onFilter(setPlatform)}>
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Input label="From" type="date" value={from} onChange={onFilter(setFrom)} max={to || undefined} hint="Scheduled date, else created date" />
        <Input label="To" type="date" value={to} onChange={onFilter(setTo)} min={from || undefined} />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter by status">
        {[{ id: "all", label: "All" }, ...POST_STATUSES].map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={status === s.id}
            onClick={() => { setStatus(s.id); setPage(1); }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              status === s.id ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface text-ink/80 hover:bg-sunken"
            )}
          >
            {s.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", status === s.id ? "bg-white/20" : "bg-sunken text-muted")}>{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && !data && <div className="space-y-3"><CardSkeleton lines={2} /><CardSkeleton lines={2} /><CardSkeleton lines={2} /></div>}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn't load posts" />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={FileText}
          title={posts.length === 0 ? "No posts yet" : "No posts match these filters"}
          description={posts.length === 0 ? "Generate content in the Content Studio or write a post yourself." : "Try a different status, platform or date range."}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => { setStatus("all"); setPlatform("all"); setFrom(""); setTo(""); setBusiness("active"); setPage(1); }}>Clear filters</Button>
            ) : (
              <ButtonLink href="/posts/new">Create a post</ButtonLink>
            )
          }
        />
      )}

      {visible.length > 0 && (
        <Card>
          <ul className="divide-y divide-line">
            {visible.map((p) => (
              <li key={p._id}>
                <Link href={`/posts/${p._id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.title || truncate(p.content, 70)}</p>
                    {p.title && <p className="mt-0.5 truncate text-sm text-muted">{truncate(p.content, 110)}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {business !== "active" && <>{nameOf(p.businessId)} · </>}
                      {p.scheduledAt && ["scheduled", "processing"].includes(p.eff.status)
                        ? `Scheduled ${formatDateTime(p.scheduledAt)}`
                        : `Created ${formatDateTime(p.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PlatformBadges platforms={p.platforms} />
                    <PostStatusBadge status={p.eff.status} derived={p.eff.derived} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {withStatus.some((p) => p.eff.derived) && (
        <p className="mt-3 text-xs text-muted">* Status derived from publish results received in this browser. The backend doesn&apos;t update a post&apos;s status after a manual publish.</p>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted">Page {current} of {pages} · {filtered.length} posts</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}><ChevronLeft className="h-4 w-4" aria-hidden /> Previous</Button>
            <Button variant="secondary" size="sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden /></Button>
          </div>
        </nav>
      )}
    </>
  );
}
