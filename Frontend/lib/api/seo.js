import { apiFetch } from "./client";

export const createWebsiteAudit = (businessId, maxPages = 100) =>
  apiFetch("/api/seo/businesses/" + businessId + "/audits", {
    method: "POST",
    body: { maxPages },
  });

export const listWebsiteAudits = (businessId) =>
  apiFetch("/api/seo/businesses/" + businessId + "/audits");

export const getWebsiteAudit = (auditId) =>
  apiFetch("/api/seo/audits/" + auditId);
