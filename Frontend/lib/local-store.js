// Small, namespaced browser cache for data the backend cannot return later.
//
// Why this exists: the API currently has no endpoint to list a post's publications or a
// business's past audits. Results returned by *your own* publish / audit requests are
// kept here (scoped per signed-in user) so the UI can show them again. This is a
// convenience record of real backend responses, NOT a source of truth. Nothing here is
// a secret: no tokens, only statuses, ids, scores and text the user already saw.

const PREFIX = "aimp.v1";

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privacy mode: degrade silently */
  }
}

const k = (userId, ...parts) => [PREFIX, userId, ...parts].join(":");

// ---- Active business (per user) ----
export const getActiveBusinessId = (userId) => read(k(userId, "activeBusiness"), null);
export const setActiveBusinessId = (userId, id) => write(k(userId, "activeBusiness"), id);

// ---- Publication results per post ----
export const getPublicationRecord = (userId, postId) =>
  read(k(userId, "publications", postId), null);

export function savePublicationResults(userId, postId, publications) {
  if (!userId || !postId || !Array.isArray(publications)) return;
  const existing = getPublicationRecord(userId, postId) || { items: {} };
  for (const p of publications) {
    const slim = {
      id: p._id || p.id,
      platform: p.platform,
      status: p.status,
      errorMessage: p.errorMessage || null,
      errorCode: p.errorCode || null,
      externalPostId: p.externalPostId || null,
      attemptCount: p.attemptCount ?? null,
      publishedAt: p.publishedAt || null,
      socialAccountId: p.socialAccountId || null,
    };
    // Keyed by platform+account so a retry replaces the earlier result instead of duplicating it.
    existing.items[`${slim.platform}:${slim.socialAccountId || slim.id}`] = slim;
  }
  existing.updatedAt = new Date().toISOString();
  write(k(userId, "publications", postId), existing);
}

export function clearPublicationRecord(userId, postId) {
  try {
    window.localStorage.removeItem(k(userId, "publications", postId));
  } catch {
    /* ignore */
  }
}

// ---- Audit history per business (most recent first, max 10) ----
export const getAuditHistory = (userId, businessId) =>
  read(k(userId, "audits", businessId), []);

export function saveAudit(userId, businessId, audit) {
  const history = getAuditHistory(userId, businessId).filter((a) => a._id !== audit._id);
  history.unshift(audit);
  write(k(userId, "audits", businessId), history.slice(0, 10));
}

// ---- Businesses the user disabled from this browser (the API hides inactive ones) ----
export const getDisabledBusinesses = (userId) => read(k(userId, "disabledBusinesses"), []);

export function addDisabledBusiness(userId, business) {
  const list = getDisabledBusinesses(userId).filter((b) => b.id !== business.id);
  list.unshift({ id: business.id, name: business.name, disabledAt: new Date().toISOString() });
  write(k(userId, "disabledBusinesses"), list.slice(0, 20));
}

export function removeDisabledBusiness(userId, businessId) {
  write(
    k(userId, "disabledBusinesses"),
    getDisabledBusinesses(userId).filter((b) => b.id !== businessId)
  );
}

// ---- Housekeeping ----
export function clearUserLocalData(userId) {
  try {
    const prefix = `${PREFIX}:${userId}:`;
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    return keys.length;
  } catch {
    return 0;
  }
}
