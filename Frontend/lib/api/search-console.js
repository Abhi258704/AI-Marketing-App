import { apiFetch } from "./client";

export const startSearchConsoleConnection = () =>
  apiFetch("/api/seo/search-console/connect", { method: "POST" });

export const getSearchConsoleConnection = (businessId) =>
  apiFetch("/api/seo/search-console/connection/" + businessId);

export const listSearchConsoleProperties = (businessId) =>
  apiFetch("/api/seo/businesses/" + businessId + "/search-console/properties");

export const selectSearchConsoleProperty = (businessId, siteUrl) =>
  apiFetch("/api/seo/businesses/" + businessId + "/search-console/property", {
    method: "POST",
    body: { siteUrl },
  });

export const getSearchConsolePerformance = (businessId, days = 28, refresh = false) =>
  apiFetch("/api/seo/businesses/" + businessId + "/search-console/performance", {
    query: { days, refresh: refresh ? "true" : undefined },
  });

export const disconnectSearchConsole = () =>
  apiFetch("/api/seo/search-console/connection", { method: "DELETE" });
