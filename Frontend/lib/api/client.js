import { API_BASE_URL } from "@/lib/config";
import { clearSession, getToken } from "@/lib/auth-storage";

export class ApiError extends Error {
  constructor(message, { status = 0, errors = [], data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}

let unauthorizedHandler = null;

// The AuthProvider registers a callback so a 401 anywhere signs the user out cleanly.
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function messageFromBody(data, status) {
  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message) return data.message;
    if (typeof data.error === "string" && data.error) return data.error;
  }
  if (status === 401) return "Your session is invalid or has expired.";
  if (status === 403) return "You don't have access to this resource.";
  if (status === 404) return "The requested resource was not found.";
  if (status >= 500) return "The server ran into a problem. Please try again.";
  return `Request failed (${status}).`;
}

/**
 * Central fetch wrapper.
 * - prefixes the configured base URL
 * - attaches the Bearer token for protected requests
 * - parses JSON and throws ApiError with a user-safe message
 * - signs the user out on 401 for authenticated requests
 * Tokens and request bodies are never logged.
 */
export async function apiFetch(
  path,
  { method = "GET", body, query, auth = true, signal } = {}
) {
  const headers = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (!token) {
      unauthorizedHandler?.();
      throw new ApiError("You are not signed in.", { status: 401 });
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError(
      "Couldn't reach the server. Check your connection and that the backend is running.",
      { status: 0 }
    );
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
      unauthorizedHandler?.();
    }
    throw new ApiError(messageFromBody(data, response.status), {
      status: response.status,
      errors: Array.isArray(data?.errors) ? data.errors : [],
      data,
    });
  }

  return data ?? {};
}

export function getErrorMessage(error, fallback = "Something went wrong.") {
  if (error instanceof ApiError) return error.message;
  if (error?.message) return error.message;
  return fallback;
}
