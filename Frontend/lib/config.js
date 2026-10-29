// Single source of truth for environment-based configuration.
// Only NEXT_PUBLIC_* values are readable in the browser, and none of them are secrets.

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
