import { apiFetch } from "./client";

export const connectGoogleBusiness = () =>
  apiFetch("/api/google-business/connect", { method: "POST" });

export const getGoogleBusinessConnection = () =>
  apiFetch("/api/google-business/connection");

export const listGoogleBusinessAccounts = () =>
  apiFetch("/api/google-business/accounts");

export const listGoogleBusinessLocations = (accountId) =>
  apiFetch(`/api/google-business/accounts/${encodeURIComponent(accountId)}/locations`);

export const disconnectGoogleBusiness = () =>
  apiFetch("/api/google-business/connection", { method: "DELETE" });
