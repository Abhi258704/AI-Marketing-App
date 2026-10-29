// Domain rules for posts, derived from Backend/src/models/post.model.js and the
// publish / scheduler controllers.

export const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
];

export const platformLabel = (id) =>
  PLATFORMS.find((p) => p.id === id)?.label || (id === "google_business" ? "Google Business" : id);

export const POST_STATUSES = [
  { id: "draft", label: "Draft", tone: "neutral" },
  { id: "scheduled", label: "Scheduled", tone: "info" },
  { id: "processing", label: "Processing", tone: "warning" },
  { id: "published", label: "Published", tone: "success" },
  { id: "partially_published", label: "Partially published", tone: "warning" },
  { id: "failed", label: "Failed", tone: "danger" },
];

export const statusMeta = (id) =>
  POST_STATUSES.find((s) => s.id === id) || { id, label: id, tone: "neutral" };

export const POST_TYPES = [
  { id: "social_post", label: "Social post" },
  { id: "advertisement", label: "Advertisement" },
];

export const INSTAGRAM_CAPTION_LIMIT = 2200;
export const INSTAGRAM_HASHTAG_LIMIT = 30;

export const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export const countHashtags = (text = "") => (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;

// Posts can be edited unless they are already live or being processed.
export const canEditPost = (post) => ["draft", "scheduled", "failed"].includes(post.status);
export const canSchedulePost = (post) => ["draft", "scheduled"].includes(post.status);
export const canCancelPost = (post) => post.status === "scheduled";
export const canDeletePost = (post) => post.status !== "processing";

/**
 * Validate a post form. `intent` is "draft" | "publish" | "schedule".
 * Returns { errors: {field: msg}, warnings: [msg] }.
 */
export function validatePost(values, intent = "draft") {
  const errors = {};
  const warnings = [];
  const content = (values.content || "").trim();
  const media = (values.mediaUrls || []).map((u) => u.trim()).filter(Boolean);
  const platforms = values.platforms || [];

  if (!values.businessId) errors.businessId = "Select a business.";
  if (!content) errors.content = "Write the post content.";
  if ((values.title || "").length > 120) errors.title = "Keep the title under 120 characters.";

  const badUrl = media.find((u) => !isHttpUrl(u));
  if (badUrl) errors.mediaUrls = `"${badUrl}" is not a valid http(s) URL.`;

  if (intent !== "draft" && platforms.length === 0) {
    errors.platforms = "Select at least one platform to publish or schedule.";
  }

  if (platforms.includes("instagram")) {
    if (intent !== "draft" && media.length === 0) {
      errors.mediaUrls =
        errors.mediaUrls ||
        "Instagram posts need at least one public image URL. Add one or deselect Instagram.";
    }
    if (content.length > INSTAGRAM_CAPTION_LIMIT) {
      errors.content = `Instagram captions are limited to ${INSTAGRAM_CAPTION_LIMIT} characters (currently ${content.length}).`;
    }
    if (countHashtags(content) > INSTAGRAM_HASHTAG_LIMIT) {
      errors.content =
        errors.content || `Instagram allows at most ${INSTAGRAM_HASHTAG_LIMIT} hashtags.`;
    }
    if (media.length > 1) {
      warnings.push("Only the first media URL is published to Instagram (single-image posts).");
    }
    if (media.length === 0 && intent === "draft") {
      warnings.push("Add an image URL before publishing or scheduling to Instagram.");
    }
  }

  if (platforms.includes("facebook") && media.length > 0) {
    warnings.push("Facebook posts currently publish text only; media URLs are not attached.");
  }

  return { errors, warnings };
}

/**
 * Effective status. The backend's publish endpoints don't update post.status (only the
 * scheduler does), so a draft published from the UI still reads "draft", and a post the
 * scheduler marked "failed" stays "failed" after a successful retry. When we hold a local
 * record of real publish results we derive a more accurate status (flagged `derived`).
 * We only claim "published" when every selected platform has a recorded success.
 */
export function effectiveStatus(post, record) {
  const base = { status: post.status, derived: false };
  if (!record?.items || !["draft", "failed", "partially_published"].includes(post.status)) return base;
  const items = Object.values(record.items);
  if (items.length === 0) return base;

  const publishedPlatforms = new Set(items.filter((i) => i.status === "published").map((i) => i.platform));
  const wanted = post.platforms || [];

  if (wanted.length > 0 && wanted.every((p) => publishedPlatforms.has(p))) {
    return { status: "published", derived: true };
  }
  if (post.status === "draft") {
    if (publishedPlatforms.size > 0) return { status: "partially_published", derived: true };
    if (items.every((i) => i.status === "failed")) return { status: "failed", derived: true };
  }
  return base;
}

export const publishedPlatformsOf = (record) =>
  new Set(
    Object.values(record?.items || {})
      .filter((i) => i.status === "published")
      .map((i) => i.platform)
  );
