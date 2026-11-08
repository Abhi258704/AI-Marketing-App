import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { decryptRefreshToken } from "./search-console-crypto.service.js";
import {
  buildSearchConsoleDateRange,
  mapSearchAnalyticsRows,
  mapSearchAnalyticsTotals,
} from "./search-console-helpers.service.js";

export const SEARCH_CONSOLE_READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export function createSearchConsoleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Search Console OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_SEARCH_CONSOLE_REDIRECT_URI to the backend environment.");
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export async function createSearchConsoleAuthorizationUrl(state) {
  const client = createSearchConsoleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent select_account",
    state,
    scope: [SEARCH_CONSOLE_READONLY_SCOPE, "openid", "email"],
  });
}

export async function exchangeSearchConsoleCode(code) {
  const client = createSearchConsoleOAuthClient();
  const result = await client.getToken(code);
  return result.tokens;
}

async function getAccessToken(connection) {
  if (!connection?.refreshTokenEncrypted) {
    throw new Error("Google Search Console is not connected. Connect the account again.");
  }
  const client = createSearchConsoleOAuthClient();
  client.setCredentials({
    refresh_token: decryptRefreshToken(connection.refreshTokenEncrypted),
  });
  const result = await client.getAccessToken();
  if (!result?.token) throw new Error("Google could not refresh the Search Console access token. Reconnect the Google account.");
  return result.token;
}

export async function fetchSearchConsoleProperties(connection) {
  const token = await getAccessToken(connection);
  const response = await axios.get("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: "Bearer " + token },
    timeout: 20000,
  });
  return (response.data?.siteEntry || []).map((item) => ({
    siteUrl: item.siteUrl,
    permissionLevel: item.permissionLevel,
  }));
}

async function querySearchAnalytics(token, siteUrl, { startDate, endDate, dimensions = [] }) {
  const encodedSite = encodeURIComponent(siteUrl);
  const url = "https://www.googleapis.com/webmasters/v3/sites/" + encodedSite + "/searchAnalytics/query";
  const body = {
    startDate,
    endDate,
    type: "web",
    rowLimit: 1000,
    dataState: "final",
  };
  if (dimensions.length) body.dimensions = dimensions;
  const response = await axios.post(url, body, {
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    timeout: 30000,
  });
  return response.data?.rows || [];
}

export async function fetchSearchConsolePerformance(connection, siteUrl, daysOrRange = 28) {
  const token = await getAccessToken(connection);
  const range = typeof daysOrRange === "object" && daysOrRange?.startDate && daysOrRange?.endDate
    ? daysOrRange
    : buildSearchConsoleDateRange(daysOrRange);
  const [totalRows, dailyRows, queryRows, pageRows, countryRows, deviceRows] = await Promise.all([
    querySearchAnalytics(token, siteUrl, range),
    querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["date"] }),
    querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["query"] }),
    querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["page"] }),
    querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["country"] }),
    querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["device"] }),
  ]);

  return {
    siteUrl,
    ...range,
    totals: mapSearchAnalyticsTotals(totalRows),
    daily: dailyRows.map((row) => ({
      date: row.keys?.[0] || "",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    })),
    queries: mapSearchAnalyticsRows(queryRows).slice(0, 100),
    pages: mapSearchAnalyticsRows(pageRows).slice(0, 100),
    countries: mapSearchAnalyticsRows(countryRows).slice(0, 100),
    devices: mapSearchAnalyticsRows(deviceRows),
    fetchedAt: new Date(),
  };
}

export function isGoogleReauthorizationError(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.status || error?.response?.data?.error;
  return status === 401 || code === "invalid_grant" || code === "UNAUTHENTICATED";
}
