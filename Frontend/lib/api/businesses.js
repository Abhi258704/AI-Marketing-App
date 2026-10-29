import { apiFetch } from "./client";

export const listBusinesses = () => apiFetch("/api/businesses");
export const getBusiness = (id) => apiFetch(`/api/businesses/${id}`);
export const createBusiness = (body) => apiFetch("/api/businesses", { method: "POST", body });
export const updateBusiness = (id, body) =>
  apiFetch(`/api/businesses/${id}`, { method: "PATCH", body });
// The backend toggles isActive (there is no explicit enable/disable body).
export const toggleBusinessStatus = (id) =>
  apiFetch(`/api/businesses/${id}/status`, { method: "PATCH" });
