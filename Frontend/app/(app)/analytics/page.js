"use client";

import { useMemo, useState } from "react";
import { BarChart3, Globe2, Lock, RefreshCw } from "lucide-react";
import { Facebook, Instagram } from "@/components/ui/brand-icons";
import { RequireBusiness } from "@/components/layout/require-business";
import { SeriesChart } from "@/components/analytics/series-chart";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Alert, Badge, CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import {
  getAnalytics,
  getAnalyticsSummary,
  syncFacebookAnalytics,
  syncInstagramAnalytics,
} from "@/lib/api/analytics";
import { listSocialAccounts } from "@/lib/api/social-accounts";
import { getErrorMessage } from "@/lib/api/client";
import {
  FACEBOOK_METRICS,
  INSTAGRAM_METRICS,
  facebookSeries,
  instagramWindows,
  latestFacebookValue,
  latestPeriodEnd,
  latestRecordTimestamp,
  splitBySource,
} from "@/lib/analytics";
import { daysAgoInput, toDateInputValue } from "@/lib/datetime";
import { formatDateTime, formatNumber, formatUtcDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRESETS = [
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "Last 90 days", days: 89 },
];

function MetricPicker({ metrics, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Chart metric">
      {metrics.map((m) => (
        <button key={m.id} role="tab" aria-selected={value === m.id} onClick={() => onChange(m.id)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", value === m.id ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface hover:bg-sunken")}>{m.label}</button>
      ))}
    </div>
  );
}

function SyncPanel({ platform, connected, onSync, syncing, lastResult, error }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onSync} loading={syncing} disabled={!connected}>
          <RefreshCw className="h-4 w-4" aria-hidden /> {syncing ? "Syncing…" : `Sync ${platform}`}
        </Button>
        {!connected && <span className="text-xs text-muted">Connect a {platform} account to sync.</span>}
        {syncing && <span className="text-xs text-muted">Fetching from {platform}. This can take a few seconds.</span>}
        {lastResult && !syncing && <span className="text-xs text-emerald-700">Synced just now · {lastResult.recordsSaved} records saved</span>}
      </div>
      {error && <Alert tone="danger" title={`${platform} sync failed`}>{error}{" "}Common causes: expired access, or the app lacks the insights permission. Try reconnecting the account.</Alert>}
    </div>
  );
}

function AnalyticsContent({ business }) {
  const toast = useToast();
  const [from, setFrom] = useState(() => daysAgoInput(29));
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [fbMetric, setFbMetric] = useState("page_media_view");
  const [igMetric, setIgMetric] = useState("reach");
  const [sync, setSync] = useState({}); // platform -> {syncing, result, error}

  const rangeValid = from && to && from <= to;
  const key = [business._id, from, to];

  const raw = useApi(
    () => getAnalytics(business._id, { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` }),
    key,
    { enabled: Boolean(rangeValid) }
  );
  const summary = useApi(() => getAnalyticsSummary(business._id, { from, to }), key, { enabled: Boolean(rangeValid) });
  const accounts = useApi(() => listSocialAccounts(business._id), [business._id]);

  const connected = useMemo(
    () => new Set((accounts.data?.socialAccounts || []).filter((a) => a.status === "connected").map((a) => a.platform)),
    [accounts.data]
  );

  const records = useMemo(() => raw.data?.analytics || [], [raw.data]);
  const { facebook, instagram } = useMemo(() => splitBySource(records), [records]);
  const windows = useMemo(() => instagramWindows(instagram), [instagram]);
  const latestWindow = windows[0];

  const fbSummary = useMemo(() => {
    const map = {};
    for (const s of summary.data?.summary || []) if (s.source === "facebook") map[s.metric] = s;
    return map;
  }, [summary.data]);

  async function runSync(platform) {
    const label = platform === "facebook" ? "Facebook" : "Instagram";
    setSync((s) => ({ ...s, [platform]: { syncing: true } }));
    try {
      const fn = platform === "facebook" ? syncFacebookAnalytics : syncInstagramAnalytics;
      const result = await fn(business._id);
      setSync((s) => ({ ...s, [platform]: { result } }));
      toast.success(`${label} analytics synced`, { message: `${result.recordsSaved ?? 0} records saved.` });
      raw.reload();
      summary.reload();
    } catch (e) {
      setSync((s) => ({ ...s, [platform]: { error: getErrorMessage(e) } }));
    }
  }

  const fbSeries = facebookSeries(facebook, fbMetric).map((p) => ({ x: p.day.slice(5), y: p.value }));
  const igSeries = [...windows].reverse().map((w) => ({ x: formatUtcDate(w.periodEnd), y: w.values[igMetric] })).filter((p) => typeof p.y === "number");
  const fbMeta = FACEBOOK_METRICS.find((m) => m.id === fbMetric);
  const igMeta = INSTAGRAM_METRICS.find((m) => m.id === igMetric);

  const loading = (raw.loading && !raw.data) || (summary.loading && !summary.data);
  const err = raw.error || summary.error;

  return (
    <>
      <PageHeader title="Analytics" description={`Performance data stored for ${business.name}. Data only appears after you sync a connected platform.`} />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <Button key={p.label} variant="secondary" size="sm" onClick={() => { setFrom(daysAgoInput(p.days)); setTo(toDateInputValue(new Date())); }}>{p.label}</Button>
            ))}
          </div>
          <Input label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} wrapperClassName="w-40" />
          <Input label="To" type="date" value={to} min={from} max={toDateInputValue(new Date())} onChange={(e) => setTo(e.target.value)} wrapperClassName="w-40" />
          <p className="basis-full text-xs text-muted">Dates are interpreted in UTC, matching how the platforms report data. The most recent ~2 days are usually unavailable because platforms report insights with a delay.</p>
        </CardBody>
      </Card>

      {!rangeValid && <Alert tone="warning">Choose a start date on or before the end date.</Alert>}
      {rangeValid && loading && <div className="grid gap-4 md:grid-cols-2"><CardSkeleton lines={5} /><CardSkeleton lines={5} /></div>}
      {rangeValid && err && <ErrorState error={err} onRetry={() => { raw.reload(); summary.reload(); }} title="Couldn't load analytics" />}

      {rangeValid && raw.data && summary.data && (
        <div className="space-y-8">
          {/* ---------------- Facebook ---------------- */}
          <section aria-labelledby="fb-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="fb-heading" className="flex items-center gap-2 text-lg font-semibold"><Facebook className="h-5 w-5" aria-hidden /> Facebook Page</h2>
              <Badge tone="info">Daily values</Badge>
            </div>
            <SyncPanel platform="Facebook" connected={connected.has("facebook")} syncing={sync.facebook?.syncing} lastResult={sync.facebook?.result} error={sync.facebook?.error} onSync={() => runSync("facebook")} />

            {facebook.length === 0 ? (
              <EmptyState icon={BarChart3} title="No Facebook analytics stored for this range" description={connected.has("facebook") ? "Run a sync to pull the latest 7 complete days from Facebook, or widen the date range." : "Connect a Facebook Page, then sync to see metrics here."} />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {FACEBOOK_METRICS.map((m) => {
                    if (m.kind === "snapshot") {
                      const latest = latestFacebookValue(facebook, m.id);
                      return <Stat key={m.id} label={m.label} value={latest ? formatNumber(latest.value) : "—"} hint={latest ? `Latest value, ${formatUtcDate(`${latest.day}T00:00:00Z`)}` : "No data"} />;
                    }
                    const s = fbSummary[m.id];
                    return <Stat key={m.id} label={m.label} value={s ? formatNumber(s.value) : "—"} hint={s ? `Total over ${s.recordsCount} day${s.recordsCount === 1 ? "" : "s"} with data` : "No data"} />;
                  })}
                </div>
                <Card>
                  <CardHeader title={fbMeta.label} description={fbMeta.help} action={<MetricPicker metrics={FACEBOOK_METRICS} value={fbMetric} onChange={setFbMetric} />} />
                  <CardBody>
                    {fbSeries.length > 1 ? (
                      <SeriesChart data={fbSeries} label={fbMeta.label} ariaLabel={`${fbMeta.label} per day, ${fbSeries.length} days`} />
                    ) : (
                      <p className="py-8 text-center text-sm text-muted">{fbSeries.length === 1 ? "Only one day of data so far. A trend needs at least two." : "No data points for this metric in the selected range."}</p>
                    )}
                  </CardBody>
                </Card>
                <p className="text-xs text-muted">Latest data period ends {formatUtcDate(latestPeriodEnd(facebook))} · newest record stored {formatDateTime(latestRecordTimestamp(facebook))}.</p>
              </>
            )}
          </section>

          {/* ---------------- Instagram ---------------- */}
          <section aria-labelledby="ig-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="ig-heading" className="flex items-center gap-2 text-lg font-semibold"><Instagram className="h-5 w-5" aria-hidden /> Instagram</h2>
              <Badge tone="info">7-day window totals</Badge>
            </div>
            <SyncPanel platform="Instagram" connected={connected.has("instagram")} syncing={sync.instagram?.syncing} lastResult={sync.instagram?.result} error={sync.instagram?.error} onSync={() => runSync("instagram")} />

            {!latestWindow ? (
              <EmptyState icon={BarChart3} title="No Instagram analytics stored for this range" description={connected.has("instagram") ? "Run a sync to pull the latest 7-day insights from Instagram." : "Connect an Instagram professional account, then sync to see metrics here."} />
            ) : (
              <>
                <Alert tone="info" title="How to read Instagram numbers">
                  Instagram insights are stored as a single total for a 7-day window ({formatUtcDate(latestWindow.periodStart)} – {formatUtcDate(latestWindow.periodEnd)} for the latest). They aren&apos;t daily values, so they&apos;re shown separately from Facebook and are never added together, and windows from different syncs overlap.
                </Alert>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {INSTAGRAM_METRICS.map((m) => (
                    <Stat key={m.id} label={m.label} value={formatNumber(latestWindow.values[m.id])} hint="Latest 7-day window" />
                  ))}
                </div>

                {igSeries.length > 1 ? (
                  <Card>
                    <CardHeader title={`${igMeta.label} by window`} description="Each point is one 7-day total, placed at the window's end date." action={<MetricPicker metrics={INSTAGRAM_METRICS} value={igMetric} onChange={setIgMetric} />} />
                    <CardBody><SeriesChart data={igSeries} label={igMeta.label} ariaLabel={`${igMeta.label} per 7-day window`} /></CardBody>
                  </Card>
                ) : (
                  <p className="text-sm text-muted">Sync again on another day to build a trend. A chart needs at least two windows.</p>
                )}

                {windows.length > 1 && (
                  <Card>
                    <CardHeader title="Stored windows" />
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                          <tr><th className="px-5 py-2 font-medium">Window (UTC)</th>{INSTAGRAM_METRICS.map((m) => <th key={m.id} className="px-3 py-2 text-right font-medium">{m.label}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {windows.slice(0, 10).map((w) => (
                            <tr key={w.key}>
                              <td className="px-5 py-2.5 whitespace-nowrap">{formatUtcDate(w.periodStart)} – {formatUtcDate(w.periodEnd)}</td>
                              {INSTAGRAM_METRICS.map((m) => <td key={m.id} className="px-3 py-2.5 text-right tabular-nums">{formatNumber(w.values[m.id])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
                <p className="text-xs text-muted">Newest record stored {formatDateTime(latestRecordTimestamp(instagram))}.</p>
              </>
            )}
          </section>

          <Card className="border-dashed">
            <CardBody className="flex items-start gap-3">
              <Globe2 className="mt-0.5 h-5 w-5 text-muted" aria-hidden />
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">Google Business Profile <Badge tone="warning"><Lock className="h-3 w-3" aria-hidden /> Coming soon</Badge></h2>
                <p className="mt-0.5 text-sm text-muted">Search and Maps insights, reviews and keyword data will appear here once Google approves API access for this project.</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return <RequireBusiness>{(business) => <AnalyticsContent key={business._id} business={business} />}</RequireBusiness>;
}
