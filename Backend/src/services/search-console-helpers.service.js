export function propertyMatchesWebsite(siteUrl, website) {
  if (!siteUrl || !website) return false;
  let target;
  try {
    const input = /^https?:\/\//i.test(String(website)) ? String(website) : "https://" + String(website);
    target = new URL(input);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(target.protocol)) return false;

  if (siteUrl.startsWith("sc-domain:")) {
    const propertyDomain = siteUrl.slice("sc-domain:".length).toLowerCase().replace(/\.$/, "");
    const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
    return Boolean(propertyDomain) && (hostname === propertyDomain || hostname.endsWith("." + propertyDomain));
  }

  try {
    const property = new URL(siteUrl);
    if (!["http:", "https:"].includes(property.protocol)) return false;
    if (property.origin !== target.origin) return false;
    const propertyPath = property.pathname.endsWith("/") ? property.pathname : property.pathname + "/";
    const targetPath = target.pathname.endsWith("/") ? target.pathname : target.pathname + "/";
    return targetPath.startsWith(propertyPath);
  } catch {
    return false;
  }
}

export function buildSearchConsoleDateRange(days = 28, now = new Date()) {
  const allowed = [7, 28, 90];
  const selected = allowed.includes(Number(days)) ? Number(days) : 28;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - selected + 1);
  const toIsoDate = (date) => date.toISOString().slice(0, 10);
  return { days: selected, startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function mapSearchAnalyticsRows(rows = []) {
  return rows.map((row) => ({
    key: row.keys?.[0] ?? "",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }));
}

export function mapSearchAnalyticsTotals(rows = []) {
  const row = rows[0] || {};
  return {
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  };
}
