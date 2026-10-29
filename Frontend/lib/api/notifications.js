import { apiFetch } from "./client";

export const listNotifications = (limit = 30) => apiFetch("/api/notifications", { query: { limit } });
export const markNotificationRead = (id) =>
  apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
export const markAllNotificationsRead = () =>
  apiFetch("/api/notifications/read-all", { method: "PATCH" });
