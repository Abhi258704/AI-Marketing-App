"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Globe, Play, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { Alert, Badge, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { useApi } from "@/lib/use-api";
import { createWebsiteAudit, getWebsiteAudit, listWebsiteAudits } from "@/lib/api/seo";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

const severityTone = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

function AuditStatus({ status }) {
  const tone = status === "completed" ? "success" : status === "failed" ? "danger" : "info";
  const label = status === "queued" ? "Queued" : status === "running" ? "In progress" : status === "completed" ? "Completed" : "Failed";
  return <Badge tone={tone}>{label}</Badge>;
}

function SeoContent({ business }) {
  const toast = useToast();
  const [pageLimit, setPageLimit] = useState("100");
  const [running, setRunning] = useState(false);
  const [actionError, setActionError] = useState(null);

  const history = useApi(() => listWebsiteAudits(business._id), [business._id]);
  const latest = history.data?.audits?.[0] || null;
  const latestId = latest?._id || null;
  const detail = useApi(() => getWebsiteAudit(latestId), [latestId], { enabled: Boolean(latestId) });
  const audit = detail.data?.audit || null;
  const isActive = latest?.status === "queued" || latest?.status === "running";

  useEffect(() => {
    if (!isActive) return undefined;
    const timer = setInterval(() => {
      history.reload();
      detail.reload();
    }, 5000);
    return () => clearInterval(timer);
  }, [isActive, history.reload, detail.reload]);

  async function runAudit() {
    setRunning(true);
    setActionError(null);
    try {
      await createWebsiteAudit(business._id, Number(pageLimit));
      toast.success("Website audit queued", { message: "You can leave this page while the report is generated." });
      history.reload();
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not start the website audit."));
    } finally {
      setRunning(false);
    }
  }

  const issueCounts = audit?.severityCounts || latest?.severityCounts || {};
  const issues = useMemo(() => audit?.issues || [], [audit?.issues]);
  const sortedIssues = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...issues].sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
  }, [issues]);
  const pages = audit?.pages || [];
  const performance = audit?.performance || latest?.performance || null;
  const pageSpeed = performance?.pageSpeed;
  const crux = performance?.crux;

  return (
    <>
      <PageHeader
        eyebrow="Grow"
        title="Website SEO"
        description={"Technical and on-page SEO checks for " + business.name + ". The crawler follows same-site links and respects robots.txt."}
        actions={
          <Button onClick={runAudit} loading={running || isActive} disabled={!business.website || running || isActive}>
            {latest?.status === "completed" ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {isActive ? "Audit running…" : running ? "Queueing…" : "Run website audit"}
          </Button>
        }
      />
      <Alert tone="info" className="mb-5" title="Coverage in this first version">
        The crawler checks HTML delivered by the website server. Pages that rely on client-side JavaScript to render their main content may be only partially analysed. Browser-rendered crawling can be added as a later phase without introducing a paid SEO data provider.
      </Alert>

      {!business.website && (
        <Alert tone="warning" title="Add a website first">
          This business does not have a website URL. Add it in the business profile, then return here to audit it.
        </Alert>
      )}

      {business.website && (
        <Card className="mb-5">
          <CardBody className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Audit target</p>
              <p className="mt-1 flex items-center gap-2 break-all text-sm font-semibold text-ink"><Globe className="h-4 w-4 shrink-0 text-muted" aria-hidden />{business.website}</p>
              <p className="mt-1 text-xs text-muted">No paid crawler or keyword data provider is used.</p>
            </div>
            <div className="w-40">
              <Select label="Page limit" value={pageLimit} onChange={(event) => setPageLimit(event.target.value)}>
                <option value="50">50 pages</option>
                <option value="100">100 pages</option>
                <option value="200">200 pages</option>
              </Select>
            </div>
          </CardBody>
        </Card>
      )}

      {actionError && <Alert tone="danger" title="Could not start audit" className="mb-5">{actionError}</Alert>}
      {history.error && <ErrorState error={history.error} onRetry={history.reload} title="Couldn't load SEO audit history" />}
      {latest?.status === "queued" && <Alert tone="info" className="mb-5" title="Audit queued">The background worker will start crawling this website shortly. This report refreshes automatically.</Alert>}
      {latest?.status === "running" && <Alert tone="info" className="mb-5" title="Website crawl in progress">The crawler is checking pages and collecting performance diagnostics. You can leave this screen and return later.</Alert>}
      {latest?.status === "failed" && <Alert tone="danger" className="mb-5" title="Audit failed">{latest.errorMessage || "The crawler could not complete this audit."}</Alert>}

      {!latest && !history.loading && business.website && (
        <EmptyState
          icon={Search}
          title="No website audit yet"
          description="Start your first crawl to check technical and on-page SEO issues across your website."
          action={<Button onClick={runAudit} loading={running}><Play className="h-4 w-4" aria-hidden /> Run first audit</Button>}
        />
      )}

      {latest?.status === "completed" && audit && (
        <div className="space-y-6">
          <Alert tone="info" title="How the health score works">
            This is our own technical SEO heuristic based on the issues found during this crawl. It is not a Google score, a ranking prediction, or a substitute for Search Console data. PageSpeed lab results and CrUX real-user data are shown separately.
          </Alert>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Website health" value={audit.score == null ? "—" : audit.score + "/100"} hint="Internal technical SEO estimate" icon={ShieldCheck} />
            <Stat label="Pages crawled" value={audit.pageCount ?? 0} hint={"Up to " + audit.maxPages + " pages"} icon={Globe} />
            <Stat label="Issues found" value={audit.issueCount ?? 0} hint={(issueCounts.critical || 0) + " critical · " + (issueCounts.high || 0) + " high"} icon={AlertTriangle} />
            <Stat label="Mobile performance" value={pageSpeed?.performanceScore == null ? "—" : pageSpeed.performanceScore + "/100"} hint={pageSpeed?.available ? "Google Lighthouse lab score" : "PageSpeed data unavailable"} icon={Activity} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Crawl checks" description="Discovery and indexing signals" />
              <CardBody className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted">robots.txt</p><p className="mt-1 text-sm font-semibold">{audit.robotsTxtFound ? "Found" : "Not found"}</p></div>
                <div><p className="text-xs text-muted">XML sitemap</p><p className="mt-1 text-sm font-semibold">{audit.sitemapFound ? "Found" : "Not found"}</p></div>
                <div><p className="text-xs text-muted">Critical issues</p><p className="mt-1 text-lg font-semibold tabular-nums">{issueCounts.critical || 0}</p></div>
                <div><p className="text-xs text-muted">High-priority issues</p><p className="mt-1 text-lg font-semibold tabular-nums">{issueCounts.high || 0}</p></div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Real-user Core Web Vitals" description="Chrome UX Report field data" />
              <CardBody>
                {crux?.available ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-xs text-muted">LCP p75</p><p className="mt-1 text-sm font-semibold">{crux.metrics?.lcpP75 ?? "—"} ms</p></div>
                    <div><p className="text-xs text-muted">INP p75</p><p className="mt-1 text-sm font-semibold">{crux.metrics?.inpP75 ?? "—"} ms</p></div>
                    <div><p className="text-xs text-muted">CLS p75</p><p className="mt-1 text-sm font-semibold">{crux.metrics?.clsP75 ?? "—"}</p></div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{crux?.reason || "CrUX data is not configured or not available for this origin."}</p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title={"Issues (" + sortedIssues.length + ")"} description="Sorted by severity. Each issue includes the page where it was found and a recommended fix." />
            {sortedIssues.length ? (
              <div className="divide-y divide-line">
                {sortedIssues.slice(0, 100).map((issue, index) => (
                  <div key={issue.code + "-" + issue.pageUrl + "-" + index} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={severityTone[issue.severity] || "neutral"}>{issue.severity}</Badge>
                      <span className="text-sm font-semibold">{issue.title}</span>
                      <Badge>{issue.category}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted">{issue.description}</p>
                    {issue.evidence && <p className="break-all text-xs text-muted">Evidence: {issue.evidence}</p>}
                    {issue.pageUrl && <a className="break-all text-xs font-medium text-brand-700 hover:underline" href={issue.pageUrl} target="_blank" rel="noreferrer">{issue.pageUrl}</a>}
                    {issue.recommendation && <p className="text-sm">Recommended fix: {issue.recommendation}</p>}
                  </div>
                ))}
              </div>
            ) : <CardBody><p className="text-sm text-muted">No issues were found in the pages crawled.</p></CardBody>}
          </Card>

          <Card>
            <CardHeader title={"Crawled pages (" + pages.length + ")"} description="HTTP status, title and basic page signals." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-5 py-3 font-medium">URL</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Title</th><th className="px-3 py-3 text-right font-medium">Words</th><th className="px-3 py-3 text-right font-medium">Images missing alt</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pages.slice(0, 100).map((page) => (
                    <tr key={page.url}>
                      <td className="max-w-sm truncate px-5 py-3"><a href={page.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">{page.url}</a></td>
                      <td className="px-3 py-3 tabular-nums">{page.statusCode || "Failed"}</td>
                      <td className="max-w-xs truncate px-3 py-3">{page.title || "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{page.wordCount}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{page.imagesMissingAlt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {pageSpeed?.available && (
            <Card>
              <CardHeader title="PageSpeed Insights — mobile lab diagnostics" description="A separate Lighthouse lab test of the website's start page." />
              <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Performance" value={pageSpeed.performanceScore ?? "—"} />
                <Stat label="Accessibility" value={pageSpeed.accessibilityScore ?? "—"} />
                <Stat label="Best practices" value={pageSpeed.bestPracticesScore ?? "—"} />
                <Stat label="Lighthouse SEO" value={pageSpeed.seoScore ?? "—"} />
                <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted">{pageSpeed.note}</p>
              </CardBody>
            </Card>
          )}
          <p className="text-xs text-muted">Audit completed {formatDateTime(audit.completedAt || latest.completedAt)}. Crawl limit: {audit.maxPages} pages.</p>
        </div>
      )}

      {history.data?.audits?.length > 1 && (
        <Card className="mt-6">
          <CardHeader title="Recent audit history" description="Your last 10 website crawls for this business." />
          <div className="divide-y divide-line">
            {history.data.audits.map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <AuditStatus status={item.status} />
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span className="text-muted">{item.pageCount || 0} pages · {item.issueCount || 0} issues</span>
                </div>
                <span className="font-semibold tabular-nums">{item.score == null ? "—" : item.score + "/100"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export default function SeoPage() {
  return <RequireBusiness>{(business) => <SeoContent key={business._id} business={business} />}</RequireBusiness>;
}
