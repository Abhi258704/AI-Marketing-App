import { apiFetch } from "./client";

export const MAX_POST_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_POST_MEDIA_ITEMS = 10;
export const ACCEPTED_POST_IMAGE_TYPES = ["image/jpeg", "image/png"];

export async function stagePostImage(file, businessId) {
  if (!file || !businessId) {
    throw new Error("Choose an image and business before staging it.");
  }

  if (!ACCEPTED_POST_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG and PNG images are supported.");
  }

  if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
    throw new Error("Each image must be 8 MB or smaller.");
  }

  const staged = await apiFetch(`/api/uploads/temp/${encodeURIComponent(businessId)}`, {
    method: "POST",
    rawBody: file,
    contentType: file.type,
  });

  if (typeof staged?.mediaUrl !== "string" || !staged.mediaUrl.startsWith("/temp/")) {
    throw new Error("The server did not return a valid temporary image reference.");
  }

  return {
    url: staged.mediaUrl,
    bytes: file.size,
    format: file.type === "image/png" ? "png" : "jpg",
  };
}
