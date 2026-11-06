import { apiFetch } from "./client";

export const submitFeedback = (body) =>
  apiFetch("/api/reviews", { method: "POST", body, auth: false });

export const listTestimonials = (businessId, query = {}) =>
  apiFetch(`/api/reviews/business/${businessId}`, { query, auth: false });

export const getPendingReviewCount = () =>
  apiFetch("/api/reviews/manage/pending-count");

export const listAdminReviews = (query = {}) =>
  apiFetch("/api/reviews/manage", { query });

export const moderateReview = (reviewId, body) =>
  apiFetch(`/api/reviews/${reviewId}/moderation`, {
    method: "PATCH",
    body,
  });
