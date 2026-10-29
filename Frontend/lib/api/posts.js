import { apiFetch } from "./client";

export const listPosts = () => apiFetch("/api/posts");
export const getPost = (id) => apiFetch(`/api/posts/${id}`);
export const createPost = (body) => apiFetch("/api/posts", { method: "POST", body });
export const updatePost = (id, body) => apiFetch(`/api/posts/${id}`, { method: "PATCH", body });
export const deletePost = (id) => apiFetch(`/api/posts/${id}`, { method: "DELETE" });
export const schedulePost = (id, scheduledAt) =>
  apiFetch(`/api/posts/${id}/schedule`, { method: "PATCH", body: { scheduledAt } });
export const cancelScheduledPost = (id) =>
  apiFetch(`/api/posts/${id}/cancel`, { method: "PATCH" });

// Publishing
export const publishPost = ({ postId, platforms }) =>
  apiFetch("/api/publish", { method: "POST", body: { postId, platforms } });

// Per-publication endpoints (used for safe retries: they only act on pending/failed).
export const createPublication = ({ postId, socialAccountId }) =>
  apiFetch("/api/post-publications", { method: "POST", body: { postId, socialAccountId } });
export const publishFacebookPublication = (publicationId) =>
  apiFetch(`/api/facebook/publish/${publicationId}`, { method: "POST" });
export const publishInstagramPublication = (publicationId) =>
  apiFetch(`/api/instagram/publish/${publicationId}`, { method: "POST" });
