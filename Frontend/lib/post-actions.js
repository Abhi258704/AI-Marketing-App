import {
  createPost,
  createPublication,
  publishFacebookPublication,
  publishInstagramPublication,
  publishPost,
  schedulePost,
  updatePost,
} from "@/lib/api/posts";
import { listSocialAccounts } from "@/lib/api/social-accounts";
import { ApiError } from "@/lib/api/client";
import { getPublicationRecord, savePublicationResults } from "@/lib/local-store";
import { publishedPlatformsOf } from "@/lib/post-rules";

const cleanMedia = (urls = []) => urls.map((u) => u.trim()).filter(Boolean);

/** Create or update a post (always as editable content; status is controlled by the backend). */
export async function savePost({ postId, values }) {
  const body = {
    title: values.title?.trim() || null,
    content: values.content.trim(),
    mediaUrls: cleanMedia(values.mediaUrls),
    postType: values.postType,
    platforms: values.platforms,
  };
  if (postId) return (await updatePost(postId, body)).post;
  return (await createPost({ businessId: values.businessId, ...body })).post;
}

export async function schedulePostAt(postId, isoString) {
  return (await schedulePost(postId, isoString)).post;
}

/**
 * Publish a post now and return a normalised result.
 *
 * Duplicate safety: POST /api/publish re-posts to every platform it is given, even ones
 * that already published. So it is only used for a never-published draft. If we have a
 * local record, or the post already failed/partially published, we use the per-publication
 * endpoints instead; the backend only lets those act on `pending` or `failed` publications.
 */
export async function publishPostSafely({ post, userId }) {
  const record = getPublicationRecord(userId, post._id);
  const alreadyPublished = publishedPlatformsOf(record);
  const targets = (post.platforms || []).filter((p) => !alreadyPublished.has(p));

  if (targets.length === 0) {
    return { items: [], missingPlatforms: [], note: "Every selected platform was already published." };
  }

  const firstAttempt = post.status === "draft" && !record?.items;

  if (firstAttempt) {
    const res = await publishPost({ postId: post._id, platforms: targets });
    savePublicationResults(userId, post._id, res.publications);
    const returned = new Set((res.publications || []).map((p) => p.platform));
    return {
      items: res.publications || [],
      missingPlatforms: targets.filter((p) => !returned.has(p)),
    };
  }

  return retryPublications({ post, userId, targets });
}

async function ensurePublication(postId, socialAccountId) {
  try {
    const res = await createPublication({ postId, socialAccountId });
    return res.publication;
  } catch (e) {
    // 409 = it already exists; the body contains it (and its current status).
    if (e instanceof ApiError && e.status === 409 && e.data?.publication) return e.data.publication;
    throw e;
  }
}

async function retryPublications({ post, userId, targets }) {
  const { socialAccounts = [] } = await listSocialAccounts(post.businessId);
  const connected = socialAccounts.filter((a) => a.status === "connected" && targets.includes(a.platform));
  const found = new Set(connected.map((a) => a.platform));
  const results = [];

  for (const account of connected) {
    let publication = await ensurePublication(post._id, account._id);

    if (["pending", "failed"].includes(publication.status)) {
      try {
        const run = account.platform === "facebook" ? publishFacebookPublication : publishInstagramPublication;
        const res = await run(publication._id);
        publication = res.publication || publication;
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) throw e; // network: outcome unknown, don't guess
        // Server marks the publication failed with a reason; read it back.
        try {
          publication = await ensurePublication(post._id, account._id);
        } catch {
          publication = { ...publication, status: "failed", errorMessage: e.message };
        }
      }
    }
    results.push(publication);
  }

  savePublicationResults(userId, post._id, results);
  return { items: results, missingPlatforms: targets.filter((p) => !found.has(p)) };
}

/** Summarise a publish result into a headline for the UI. */
export function summarizePublish({ items, missingPlatforms = [] }) {
  const published = items.filter((i) => i.status === "published").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const inFlight = items.filter((i) => ["pending", "publishing"].includes(i.status)).length;
  const total = items.length + missingPlatforms.length;

  if (total > 0 && published === total) return { tone: "success", title: "Published successfully" };
  if (published > 0) return { tone: "warning", title: "Partially published" };
  if (inFlight > 0 && failed === 0) return { tone: "info", title: "Publishing in progress" };
  return { tone: "danger", title: "Publishing failed" };
}
