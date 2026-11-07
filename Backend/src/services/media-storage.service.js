import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const TEMP_MEDIA_ROOT = path.resolve(SERVICE_DIR, "../../public/temp");
const ALLOWED_IMAGE_FORMATS = "jpg,jpeg,png";

function createCloudinarySignature(params, apiSecret) {
    const payload = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");

    return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function getTempFileInfo(mediaUrl, business) {
    if (typeof mediaUrl !== "string" || !mediaUrl.startsWith("/temp/")) return null;

    const ownerId = String(business.ownerId);
    const businessId = String(business._id);
    const expectedPrefix = `/temp/${ownerId}/${businessId}/`;

    if (!mediaUrl.startsWith(expectedPrefix)) {
        throw new Error("A staged image does not belong to this business.");
    }

    const fileName = mediaUrl.slice(expectedPrefix.length);
    if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png)$/i.test(fileName)) {
        throw new Error("A staged image reference is invalid. Please upload it again.");
    }

    return {
        fileName,
        filePath: path.join(TEMP_MEDIA_ROOT, ownerId, businessId, fileName),
    };
}

async function uploadBufferToCloudinary(buffer, fileName, mimeType, business) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary is not configured. Add the three Cloudinary variables to Backend/.env.");
    }
    if (typeof FormData === "undefined" || typeof Blob === "undefined") {
        throw new Error("Server-side uploads require Node.js 20 or later.");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const params = {
        timestamp,
        folder: `ai-marketing-platform/${business.ownerId}/${business._id}`,
        public_id: `image_${randomUUID()}`,
        allowed_formats: ALLOWED_IMAGE_FORMATS,
        overwrite: false,
    };
    const signature = createCloudinarySignature(params, apiSecret);
    const formData = new FormData();

    formData.append("file", new Blob([buffer], { type: mimeType }), fileName);
    formData.append("api_key", apiKey);
    formData.append("signature", signature);
    for (const [key, value] of Object.entries(params)) {
        formData.append(key, String(value));
    }

    let response;
    try {
        response = await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
            { method: "POST", body: formData }
        );
    } catch {
        throw new Error("Could not reach Cloudinary while publishing. Please try again.");
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(result?.error?.message || "Cloudinary could not store the staged image.");
    }
    if (typeof result?.secure_url !== "string" || !result.secure_url.startsWith("https://res.cloudinary.com/")) {
        throw new Error("Cloudinary returned an invalid image URL.");
    }

    return result.secure_url;
}

export async function promoteTemporaryMedia(post, business) {
    if (!Array.isArray(post?.mediaUrls) || post.mediaUrls.length === 0) return false;

    let changed = false;
    for (let index = 0; index < post.mediaUrls.length; index += 1) {
        const fileInfo = getTempFileInfo(post.mediaUrls[index], business);
        if (!fileInfo) continue;

        let buffer;
        try {
            buffer = await fs.readFile(fileInfo.filePath);
        } catch {
            throw new Error("A staged image is no longer available in Backend/public/temp. Please edit the draft and upload it again.");
        }

        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        if (!isPng && !isJpeg) {
            throw new Error("A staged file is not a valid JPG or PNG image. Please upload it again.");
        }

        const permanentUrl = await uploadBufferToCloudinary(
            buffer,
            fileInfo.fileName,
            isPng ? "image/png" : "image/jpeg",
            business
        );

        // Persist each replacement before moving to the next image, so retries are safe.
        post.mediaUrls[index] = permanentUrl;
        await post.save();
        changed = true;
        await fs.unlink(fileInfo.filePath).catch((error) => {
            console.warn("Could not remove promoted temporary image:", error.message);
        });
    }

    return changed;
}

export async function removeTemporaryMedia(mediaUrls, business) {
    if (!Array.isArray(mediaUrls) || !business) return;

    for (const mediaUrl of mediaUrls) {
        try {
            const fileInfo = getTempFileInfo(mediaUrl, business);
            if (fileInfo) await fs.unlink(fileInfo.filePath).catch(() => {});
        } catch (error) {
            console.warn("Could not clean up a temporary media file:", error.message);
        }
    }
}
