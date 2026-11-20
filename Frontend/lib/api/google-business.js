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

export const getGoogleBusinessLocationMapping = (businessId) =>
  apiFetch(`/api/google-business/businesses/${encodeURIComponent(businessId)}/location`);

export const saveGoogleBusinessLocationMapping = (businessId, mapping) =>
  apiFetch(`/api/google-business/businesses/${encodeURIComponent(businessId)}/location`, {
    method: "PUT",
    body: mapping,
  });

export const deleteGoogleBusinessLocationMapping = (businessId) =>
  apiFetch(`/api/google-business/businesses/${encodeURIComponent(businessId)}/location`, {
    method: "DELETE",
  });

export const listGoogleBusinessReviews = (businessId, pageToken) =>
  apiFetch(`/api/google-business/businesses/${encodeURIComponent(businessId)}/reviews`, {
    query: pageToken ? { pageToken } : undefined,
  });

export const generateGoogleBusinessReviewReplyDraft = (businessId, reviewId, review) =>
  apiFetch(
    `/api/google-business/businesses/${encodeURIComponent(businessId)}/reviews/${encodeURIComponent(reviewId)}/draft-reply`,
    {
      method: "POST",
      body: review,
    }
  );

export const listGoogleBusinessReviewReplyDrafts = (businessId) =>
  apiFetch(`/api/google-business/businesses/${encodeURIComponent(businessId)}/review-reply-drafts`);

export const saveGoogleBusinessReviewReplyDraft = (businessId, reviewId, reply) =>
  apiFetch(
    `/api/google-business/businesses/${encodeURIComponent(businessId)}/reviews/${encodeURIComponent(reviewId)}/draft-reply`,
    {
      method: "PUT",
      body: { reply },
    }
  );

export const publishGoogleBusinessReviewReply = (businessId, reviewId) =>
  apiFetch(
    `/api/google-business/businesses/${encodeURIComponent(businessId)}/reviews/${encodeURIComponent(reviewId)}/publish-reply`,
    { method: "POST" }
  );
