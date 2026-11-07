import { apiFetch } from "./client";

export const MAX_POST_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_POST_MEDIA_ITEMS = 10;
export const ACCEPTED_POST_IMAGE_TYPES = ["image/jpeg", "image/png"];

export async function uploadPostImage(file, businessId) {
  if (!file || !businessId) {
    throw new Error("Choose an image and business before uploading.");
  }

  if (!ACCEPTED_POST_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG and PNG images are supported.");
  }

  if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
    throw new Error("Each image must be 8 MB or smaller.");
  }

  // Request a fresh signature for every file. The API secret remains on the backend.
  const signed = await apiFetch("/api/uploads/sign", {
    method: "POST",
    body: { businessId },
  });

  if (!signed?.cloudName || !signed?.apiKey || !signed?.signature || !signed?.params) {
    throw new Error("The server returned incomplete Cloudinary upload credentials.");
  }

  const serverFileLimit = Number(signed.maxFileSizeBytes) || MAX_POST_IMAGE_SIZE_BYTES;
  if (file.size > serverFileLimit) {
    throw new Error(`Each image must be ${(serverFileLimit / (1024 * 1024)).toFixed(0)} MB or smaller.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("signature", signed.signature);

  // Send exactly the parameters signed by the backend.
  for (const [key, value] of Object.entries(signed.params)) {
    formData.append(key, String(value));
  }

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`,
      { method: "POST", body: formData }
    );
  } catch {
    throw new Error("Couldn't reach Cloudinary. Check your connection and try again.");
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.error?.message || "Cloudinary couldn't upload this image.");
  }

  if (
    typeof result?.secure_url !== "string" ||
    !result.secure_url.startsWith("https://res.cloudinary.com/")
  ) {
    throw new Error("Cloudinary returned an invalid image URL.");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format,
  };
}
