"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { PlatformBadges, PostStatusBadge } from "@/components/posts/post-badges";
import { usePublicationRecords } from "@/components/posts/use-publication-record";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import { listPosts } from "@/lib/api/posts";
import { effectiveStatus, statusMeta } from "@/lib/post-rules";
import { getTimeZoneName, toDateInputValue } from "@/lib/datetime";
import { formatDateTime, truncate } from "@/lib/format";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TONE_DOT = { info: "bg-sky-500", success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500", neutral: "bg-line-strong" };

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function CalendarContent({ business }) {
  const { data, loading, error, reload } = useApi(() => listPosts(), []);
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(toDateInputValue(today));

  const posts = useMemo(() => (data?.posts || []).filter((p) => p.businessId === business._id), [data, business._id]);
  const records = usePublicationRecords(posts);

  const scheduled = useMemo(
    () => posts.filter((p) => p.scheduledAt).map((p) => ({ ...p, eff: effectiveStatus(p, records[p._id]) })),
    [posts, records]
  );
  const unscheduledDrafts = posts.filter((p) => p.status === "draft" && !p.scheduledAt);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const p of scheduled) {
      const key = toDateInputValue(new Date(p.scheduledAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    return map;
  }, [scheduled]);

  const upcoming = scheduled
    .filter((p) => p.eff.status === "scheduled" && new Date(p.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 6);

  const grid = buildMonthGrid(cursor.year, cursor.month);
  const todayKey = toDateInputValue(today);
  const shift = (delta) => setCursor(({ year, month }) => {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const selectedPosts = byDay.get(selected) || [];
  const selectedDate = new Date(`${selected}T00:00:00`);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`Scheduled and published content for ${business.name}. Times shown in ${getTimeZoneName()}.`}
        actions={<ButtonLink href="/posts/new"><Plus className="h-4 w-4" aria-hidden /> New post</ButtonLink>}
      />

      {loading && !data && <CardSkeleton lines={8} />}
      {error && <ErrorState error={error} onRetry={reload} title="Couldn't load posts" />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-base font-semibold" aria-live="polite">{monthFmt.format(new Date(cursor.year, cursor.month, 1))}</h2>
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => { setCursor({ year: today.getFullYear(), month: today.getMonth() }); setSelected(todayKey); }}>Today</Button>
                  <Button variant="secondary" size="sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="secondary" size="sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[34rem]">
                  <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-medium text-muted">
                    {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {grid.map((date) => {
                      const key = toDateInputValue(date);
                      const inMonth = date.getMonth() === cursor.month;
                      const items = byDay.get(key) || [];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelected(key)}
                          aria-label={`${dayFmt.format(date)}, ${items.length} post${items.length === 1 ? "" : "s"}`}
                          aria-pressed={selected === key}
                          className={cn(
                            "flex min-h-24 flex-col items-stretch gap-1 border-b border-r border-line p-1.5 text-left transition-colors hover:bg-canvas",
                            !inMonth && "bg-canvas/60 text-muted/70",
                            selected === key && "bg-brand-50/70 ring-2 ring-inset ring-brand-600"
                          )}
                        >
                          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium", key === todayKey && "bg-brand-700 text-white")}>{date.getDate()}</span>
                          {items.slice(0, 2).map((p) => (
                            <span key={p._id} className="flex items-center gap-1 truncate rounded bg-surface px-1 py-0.5 text-[11px] ring-1 ring-line">
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[statusMeta(p.eff.status).tone])} aria-hidden />
                              <span className="truncate">{timeFmt.format(new Date(p.scheduledAt))} {p.title || truncate(p.content, 14)}</span>
                            </span>
                          ))}
                          {items.length > 2 && <span className="px-1 text-[11px] font-medium text-muted">+{items.length - 2} more</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title={dayFmt.format(selectedDate)} description={selectedPosts.length ? `${selectedPosts.length} post${selectedPosts.length === 1 ? "" : "s"}` : undefined} />
              {selectedPosts.length === 0 ? (
                <CardBody><p className="text-sm text-muted">Nothing scheduled for this day.</p></CardBody>
              ) : (
                <ul className="divide-y divide-line">
                  {selectedPosts.map((p) => (
                    <li key={p._id}>
                      <Link href={`/posts/${p._id}`} className="flex flex-col gap-2 px-5 py-3 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.title || truncate(p.content, 70)}</p>
                          <p className="text-xs text-muted">{timeFmt.format(new Date(p.scheduledAt))}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2"><PlatformBadges platforms={p.platforms} /><PostStatusBadge status={p.eff.status} derived={p.eff.derived} /></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader title="Upcoming" />
              {upcoming.length === 0 ? (
                <CardBody>
                  <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Schedule a post to see it here." className="border-0 bg-transparent p-2" action={<ButtonLink size="sm" href="/posts/new">Create a post</ButtonLink>} />
                </CardBody>
              ) : (
                <ul className="divide-y divide-line">
                  {upcoming.map((p) => (
                    <li key={p._id}>
                      <Link href={`/posts/${p._id}`} className="block px-5 py-3 hover:bg-canvas">
                        <p className="truncate text-sm font-medium">{p.title || truncate(p.content, 50)}</p>
                        <p className="text-xs text-muted">{formatDateTime(p.scheduledAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Unscheduled drafts" description={`${unscheduledDrafts.length} waiting`} />
              {unscheduledDrafts.length === 0 ? (
                <CardBody><p className="text-sm text-muted">No drafts waiting to be scheduled.</p></CardBody>
              ) : (
                <ul className="divide-y divide-line">
                  {unscheduledDrafts.slice(0, 6).map((p) => (
                    <li key={p._id}>
                      <Link href={`/posts/${p._id}`} className="block px-5 py-3 hover:bg-canvas">
                        <p className="truncate text-sm font-medium">{p.title || truncate(p.content, 50)}</p>
                        <p className="text-xs text-muted">Created {formatDateTime(p.createdAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

export default function CalendarPage() {
  return <RequireBusiness>{(business) => <CalendarContent key={business._id} business={business} />}</RequireBusiness>;
}
