import { apiFetch } from "./client";

export const getAnalytics = (businessId, query) =>
  apiFetch(`/api/analytics/business/${businessId}`, { query });
export const getAnalyticsSummary = (businessId, { from, to }) =>
  apiFetch(`/api/analytics/business/${businessId}/summary`, { query: { from, to } });
export const syncFacebookAnalytics = (businessId) =>
  apiFetch(`/api/analytics/business/${businessId}/facebook/sync`, { method: "POST" });
export const syncInstagramAnalytics = (businessId) =>
  apiFetch(`/api/analytics/business/${businessId}/instagram/sync`, { method: "POST" });
