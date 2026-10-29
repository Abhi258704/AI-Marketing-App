// Session persistence for the Bearer-JWT flow the backend implements.
//
// Security trade-off: the backend issues a 7-day JWT in the response body and only
// accepts it via the `Authorization: Bearer` header (no cookie sessions, no refresh
// tokens). The token therefore has to live in JavaScript-readable storage. We use
// localStorage so the session survives reloads; this means an XSS bug could read it.
// Mitigations: no third-party scripts besides Google Sign-In, React's default output
// escaping, no dangerouslySetInnerHTML, and automatic cleanup on expiry/401.

const TOKEN_KEY = "aimp.token";
const USER_KEY = "aimp.user";
const LEGACY_TOKEN_KEY = "token"; // key used by the original login prototype

const isBrowser = () => typeof window !== "undefined";

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / quota) */
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function decodeTokenExpiry(token) {
  // Used only for UX (auto sign-out). The backend remains the authority.
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json);
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const expiresAt = decodeTokenExpiry(token);
  return expiresAt !== null && expiresAt <= Date.now();
}

export function getToken() {
  if (!isBrowser()) return null;
  let token = safeGet(TOKEN_KEY);
  if (!token) {
    const legacy = safeGet(LEGACY_TOKEN_KEY);
    if (legacy) {
      safeSet(TOKEN_KEY, legacy);
      safeRemove(LEGACY_TOKEN_KEY);
      token = legacy;
    }
  }
  return token;
}

export function getStoredUser() {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(safeGet(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  safeSet(TOKEN_KEY, token);
  if (user) safeSet(USER_KEY, JSON.stringify(user));
}

export function setStoredUser(user) {
  safeSet(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (!isBrowser()) return;
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
  safeRemove(LEGACY_TOKEN_KEY);
}
