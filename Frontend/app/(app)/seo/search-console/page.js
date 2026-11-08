"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, ExternalLink, Globe2, Link2, RefreshCw, Search, Unplug } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { useToast } from "@/components/providers/toast-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { Alert, Badge, ErrorState, CardSkeleton } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { SeriesChart } from "@/components/analytics/series-chart";
import { useApi } from "@/lib/use-api";
import {
  disconnectSearchConsole,
  getSearchConsoleConnection,
  getSearchConsolePerformance,
  listSearchConsoleProperties,
  selectSearchConsoleProperty,
  startSearchConsoleConnection,
} from "@/lib/api/search-console";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatNumber } from "@/lib/format";

function formatPercent(value) {
  return (Number(value || 0) * 100).toFixed(2) + "%";
}

function MetricTable({ title, description, rows, emptyLabel, showUrl = false }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {rows?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{showUrl ? "Page" : "Search term"}</th>
                <th className="px-3 py-3 text-right font-medium">Clicks</th>
                <th className="px-3 py-3 text-right font-medium">Impressions</th>
                <th className="px-3 py-3 text-right font-medium">CTR</th>
                <th className="px-3 py-3 text-right font-medium">Avg. position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.slice(0, 20).map((row, index) => (
                <tr key={row.key + "-" + index}>
                  <td className="max-w-[22rem] truncate px-5 py-3" title={row.key}>
                    {showUrl ? (
                      <a href={row.key} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">{row.key}</a>
                    ) : row.key}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.clicks)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.impressions)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPercent(row.ctr)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Number(row.position || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <CardBody><p className="text-sm text-muted">{emptyLabel}</p></CardBody>}
    </Card>
  );
}

function SearchConsoleContent({ business }) {
  const toast = useToast();
  const [days, setDays] = useState("28");
  const [selectedSite, setSelectedSite] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [chartMetric, setChartMetric] = useState("clicks");
  const [actionError, setActionError] = useState("");

  const connection = useApi(() => getSearchConsoleConnection(business._id), [business._id]);
  const isConnected = connection.data?.connected === true;
  const selectedProperty = connection.data?.property || null;
  const properties = useApi(
    () => listSearchConsoleProperties(business._id),
    [business._id, isConnected],
    { enabled: isConnected }
  );
  const propertyOptions = (properties.data?.properties || []).filter((item) => item.selectable);
  const propertyOptionsKey = propertyOptions.map((item) => item.siteUrl).join("|");
  const report = useApi(
    () => getSearchConsolePerformance(business._id, Number(days)),
    [business._id, days, selectedProperty?.siteUrl || ""],
    { enabled: Boolean(isConnected && selectedProperty?.siteUrl) }
  );

  useEffect(() => {
    const current = selectedProperty?.siteUrl;
    const firstAvailable = propertyOptions[0]?.siteUrl || "";
    setSelectedSite(current || firstAvailable);
  }, [selectedProperty?.siteUrl, propertyOptionsKey]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("gsc");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google Search Console connected", { message: "Choose the matching website property below." });
      connection.reload();
    } else {
      toast.error("Google connection not completed", {
        message: url.searchParams.get("gsc_message") || "Try connecting the Google account again.",
      });
    }
    url.searchParams.delete("gsc");
    url.searchParams.delete("gsc_message");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [connection.reload, toast]);

  async function connect() {
    setConnecting(true);
    setActionError("");
    try {
      const result = await startSearchConsoleConnection();
      if (!result.authorizationUrl) throw new Error("The backend did not return a Google authorization URL.");
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not start Google Search Console connection."));
      setConnecting(false);
    }
  }

  async function saveProperty() {
    if (!selectedSite) return;
    setSavingProperty(true);
    setActionError("");
    try {
      await selectSearchConsoleProperty(business._id, selectedSite);
      toast.success("Search Console property saved", { message: "Search performance is now linked to this business." });
      connection.reload();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not select this Search Console property."));
    } finally {
      setSavingProperty(false);
    }
  }

  async function refreshReport() {
    setRefreshing(true);
    setActionError("");
    try {
      await getSearchConsolePerformance(business._id, Number(days), true);
      report.reload();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not refresh Search Console data."));
    } finally {
      setRefreshing(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    setActionError("");
    try {
      await disconnectSearchConsole();
      toast.success("Google Search Console disconnected");
      setSelectedSite("");
      connection.reload();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not disconnect Google Search Console."));
    } finally {
      setDisconnecting(false);
    }
  }

  const reportData = report.loading ? null : report.data?.report || null;
  const daily = useMemo(
    () => [...(reportData?.daily || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [reportData?.daily]
  );
  const chartData = daily.map((row) => ({
    x: row.date.slice(5),
    y: Number(row[chartMetric] || 0),
  }));
  const totals = reportData?.totals;
  const statusLoading = connection.loading && !connection.data;

  return (
    <>
      <PageHeader
        eyebrow="Website SEO"
        title="Google Search Console"
        description={"Organic Google Search performance for " + business.name + "."}
        actions={<ButtonLink href="/seo" variant="secondary" size="sm"><ArrowLeft className="h-4 w-4" aria-hidden /> Website audit</ButtonLink>}
      />

      {actionError && <Alert tone="danger" title="Action failed" className="mb-5">{actionError}</Alert>}
      {connection.error && <ErrorState error={connection.error} onRetry={connection.reload} title="Couldn't load connection status" />}
      {statusLoading && <CardSkeleton lines={4} />}

      {!statusLoading && !isConnected && (
        <Card>
          <CardBody className="flex flex-col items-start gap-4 py-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Search className="h-6 w-6" aria-hidden /></span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Connect Google Search Console</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                Connect the Google account that has access to this business website's Search Console property. We request read-only search performance access.
              </p>
            </div>
            <Button onClick={connect} loading={connecting}><Link2 className="h-4 w-4" aria-hidden /> Connect Google Search Console</Button>
            <p className="text-xs text-muted">Your Google account must have access to a verified Search Console property matching {business.website || "this business website"}.</p>
          </CardBody>
        </Card>
      )}

      {isConnected && (
        <div className="space-y-5">
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success"><CheckCircle2 className="h-3 w-3" aria-hidden /> Google account connected</Badge>
                  {selectedProperty && <Badge>Property selected</Badge>}
                </div>
                <p className="mt-2 text-sm font-semibold">{connection.data?.connection?.googleEmail || "Google account"}</p>
                {connection.data?.connection?.connectedAt && <p className="text-xs text-muted">Connected {formatDateTime(connection.data.connection.connectedAt)}</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={disconnect} loading={disconnecting}><Unplug className="h-4 w-4" aria-hidden /> Disconnect</Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Search Console property" description="Choose the property that matches the website saved on this business." />
            <CardBody className="space-y-3">
              {!business.website && <Alert tone="warning" title="Add a business website first">This business profile does not have a website URL.</Alert>}
              {properties.loading && <p className="text-sm text-muted">Loading properties from Google…</p>}
              {properties.error && <ErrorState error={properties.error} onRetry={properties.reload} title="Couldn't load Search Console properties" />}
              {!properties.loading && !properties.error && propertyOptions.length === 0 && (
                <Alert tone="warning" title="No matching property found">
                  This Google account has no selectable Search Console property matching {business.website || "the business website"}. Add and verify the website in Google Search Console, then reload properties.
                  {" "}<a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="font-medium underline">Open Search Console <ExternalLink className="inline h-3 w-3" /></a>
                </Alert>
              )}
              {propertyOptions.length > 0 && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[17rem] flex-1">
                    <Select label="Available website property" value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)}>
                      <option value="">Choose a property…</option>
                      {propertyOptions.map((item) => (
                        <option key={item.siteUrl} value={item.siteUrl}>{item.siteUrl} · {item.permissionLevel}</option>
                      ))}
                    </Select>
                  </div>
                  <Button onClick={saveProperty} loading={savingProperty} disabled={!selectedSite || selectedSite === selectedProperty?.siteUrl}>
                    Save property
                  </Button>
                  <Button variant="secondary" size="sm" onClick={properties.reload}><RefreshCw className="h-4 w-4" aria-hidden /> Reload properties</Button>
                </div>
              )}
              {selectedProperty && <p className="text-xs text-muted">Current property: {selectedProperty.siteUrl} · Permission: {selectedProperty.permissionLevel}</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {isConnected && selectedProperty && (
        <div className="mt-6 space-y-5">
          <Card>
            <CardBody className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Search performance period</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold"><Globe2 className="h-4 w-4 text-muted" aria-hidden />{reportData?.siteUrl || selectedProperty.siteUrl}</p>
                {reportData && <p className="mt-1 text-xs text-muted">Data from {reportData.startDate} to {reportData.endDate}. Updated {formatDateTime(reportData.fetchedAt)}.</p>}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-36">
                  <Select label="Date range" value={days} onChange={(event) => setDays(event.target.value)}>
                    <option value="7">Last 7 days</option>
                    <option value="28">Last 28 days</option>
                    <option value="90">Last 90 days</option>
                  </Select>
                </div>
                <Button variant="secondary" onClick={refreshReport} loading={refreshing || report.loading}><RefreshCw className="h-4 w-4" aria-hidden /> Refresh data</Button>
              </div>
            </CardBody>
          </Card>

          {report.loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>}
          {report.error && <ErrorState error={report.error} onRetry={report.reload} title="Couldn't load Search Console performance" />}
          {reportData && (
            <>
              <Alert tone="info" title="About Search Console data">
                {reportData.note} Average position is the average position of your site's results; it is not an exact current rank for an individual search.
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Organic clicks" value={formatNumber(totals?.clicks)} hint="Clicks from Google Search" icon={Search} />
                <Stat label="Impressions" value={formatNumber(totals?.impressions)} hint="Appearances in Google Search" icon={BarChart3} />
                <Stat label="Average CTR" value={formatPercent(totals?.ctr)} hint="Clicks divided by impressions" />
                <Stat label="Average position" value={Number(totals?.position || 0).toFixed(1)} hint="Average search-result position" />
              </div>

              <Card>
                <CardHeader
                  title="Daily search performance"
                  description="Search clicks and impressions over the selected period."
                  action={
                    <div className="flex gap-1" role="group" aria-label="Chart metric">
                      <Button size="sm" variant={chartMetric === "clicks" ? "primary" : "secondary"} onClick={() => setChartMetric("clicks")}>Clicks</Button>
                      <Button size="sm" variant={chartMetric === "impressions" ? "primary" : "secondary"} onClick={() => setChartMetric("impressions")}>Impressions</Button>
                    </div>
                  }
                />
                <CardBody>
                  {chartData.length > 1 ? <SeriesChart data={chartData} label={chartMetric} ariaLabel={"Daily organic " + chartMetric} /> : <p className="py-8 text-center text-sm text-muted">Google returned fewer than two daily data points for this period.</p>}
                </CardBody>
              </Card>

              <MetricTable title="Top search queries" description="Search terms that generated impressions and clicks." rows={reportData.queries} emptyLabel="No query rows were returned for this period." />
              <MetricTable title="Top pages" description="Pages receiving organic Google Search traffic." rows={reportData.pages} emptyLabel="No page rows were returned for this period." showUrl />
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Countries" description="Where search impressions came from." />
                  <CardBody>
                    {reportData.countries?.length ? <div className="space-y-2">{reportData.countries.slice(0, 10).map((row) => <div key={row.key} className="flex justify-between gap-3 text-sm"><span className="font-medium">{row.key.toUpperCase()}</span><span className="text-muted">{formatNumber(row.clicks)} clicks · {formatNumber(row.impressions)} impressions</span></div>)}</div> : <p className="text-sm text-muted">No country data for this period.</p>}
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Devices" description="Performance by device category." />
                  <CardBody>
                    {reportData.devices?.length ? <div className="space-y-2">{reportData.devices.map((row) => <div key={row.key} className="flex justify-between gap-3 text-sm"><span className="font-medium capitalize">{row.key.toLowerCase()}</span><span className="text-muted">{formatNumber(row.clicks)} clicks · {formatNumber(row.impressions)} impressions</span></div>)}</div> : <p className="text-sm text-muted">No device data for this period.</p>}
                  </CardBody>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">Read-only Search Console access. Reports are cached for six hours to reduce repeated Google API requests.</p>
    </>
  );
}

export default function SearchConsolePage() {
  return <RequireBusiness>{(business) => <SearchConsoleContent key={business._id} business={business} />}</RequireBusiness>;
}
