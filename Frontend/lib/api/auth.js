import { apiFetch } from "./client";

export const loginWithGoogle = (credential) =>
  apiFetch("/api/auth/google", { method: "POST", body: { credential }, auth: false });

export const getCurrentUser = () => apiFetch("/api/users/me");
