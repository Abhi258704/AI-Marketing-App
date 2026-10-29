import { apiFetch } from "./client";

export const listAuditRecommendations = (auditId) =>
  apiFetch(`/api/recommendations/audit/${auditId}`);
export const updateRecommendationStatus = (id, status) =>
  apiFetch(`/api/recommendations/${id}/status`, { method: "PATCH", body: { status } });
