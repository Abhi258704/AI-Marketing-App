// Helpers that turn raw Analytics documents into display data without inventing numbers.
//
// Backend facts (services/analytics.service.js):
// - Facebook: one document per metric per UTC day (periodEnd - periodStart = 1 day).
//   `page_follows` is a running total (a snapshot), so it must not be summed.
// - Instagram: one document per metric for a 7-day reporting window (total_value). A new
//   sync on a later day creates a *different, overlapping* window, so windows must not be
//   added together.

export const FACEBOOK_METRICS = [
  { id: "page_follows", label: "Page follows", kind: "snapshot", help: "Total page follows (latest daily value)." },
  { id: "page_media_view", label: "Media views", kind: "sum", help: "Views of page content, summed over the selected days." },
  { id: "page_post_engagements", label: "Post engagements", kind: "sum", help: "Engagements on page posts, summed over the selected days." },
  { id: "page_views_total", label: "Page views", kind: "sum", help: "Page views, summed over the selected days." },
];

export const INSTAGRAM_METRICS = [
  { id: "reach", label: "Reach", help: "Unique accounts that saw your content." },
  { id: "views", label: "Views", help: "Total views of your content." },
  { id: "accounts_engaged", label: "Accounts engaged", help: "Unique accounts that interacted." },
  { id: "total_interactions", label: "Total interactions", help: "Likes, comments, saves, shares, etc." },
];

const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);

export function splitBySource(records = []) {
  return {
    facebook: records.filter((r) => r.source === "facebook"),
    instagram: records.filter((r) => r.source === "instagram"),
  };
}

// Facebook: daily series per metric, sorted ascending.
export function facebookSeries(records, metricId) {
  const byDay = new Map();
  for (const r of records) {
    if (r.metric !== metricId) continue;
    byDay.set(dayKey(r.periodEnd), r.value);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({ day, value }));
}

export function latestFacebookValue(records, metricId) {
  const series = facebookSeries(records, metricId);
  return series.length ? series[series.length - 1] : null;
}

// Instagram: distinct windows (by start/end), newest first, each with its metric values.
export function instagramWindows(records) {
  const map = new Map();
  for (const r of records) {
    const key = `${r.periodStart}|${r.periodEnd}`;
    if (!map.has(key)) {
      map.set(key, { key, periodStart: r.periodStart, periodEnd: r.periodEnd, values: {} });
    }
    map.get(key).values[r.metric] = r.value;
  }
  return [...map.values()].sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd));
}

export function latestRecordTimestamp(records) {
  const times = records.map((r) => new Date(r.createdAt).getTime()).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

export function latestPeriodEnd(records) {
  const times = records.map((r) => new Date(r.periodEnd).getTime()).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}
