import { apiFetch } from "./client";

export const generateContent = (body) =>
  apiFetch("/api/ai/generate-content", { method: "POST", body });

export const runBusinessAudit = (businessId) =>
  apiFetch("/api/ai/business-audit", { method: "POST", body: { businessId } });
