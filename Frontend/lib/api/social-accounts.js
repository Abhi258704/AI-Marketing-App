import { apiFetch } from "./client";

export const listSocialAccounts = (businessId) =>
  apiFetch(`/api/social-accounts/business/${businessId}`);

export const getFacebookConnectUrl = (businessId) =>
  apiFetch("/api/facebook/connect", { query: { businessId } });

export const getInstagramConnectUrl = (businessId) =>
  apiFetch("/api/social-accounts/instagram/connect", { query: { businessId } });
