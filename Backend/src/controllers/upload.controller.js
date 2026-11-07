import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Business from "../models/business.model.js";

const ALLOWED_IMAGE_FORMATS = "jpg,jpeg,png";
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function createCloudinarySignature(params, apiSecret) {
    const payload = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");

    return createHash("sha1")
        .update(`${payload}${apiSecret}`)
        .digest("hex");
}

const createImageUploadSignature = async (req, res) => {
    try {
        const { businessId } = req.body || {};

        if (!businessId || !mongoose.isValidObjectId(businessId)) {
            return res.status(400).json({
                success: false,
                message: "A valid businessId is required",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        }).select("_id");

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(503).json({
                success: false,
                message: "Image uploads are not configured. Add the Cloudinary credentials to the backend environment.",
            });
        }

        const timestamp = Math.round(Date.now() / 1000);
        const params = {
            timestamp,
            folder: `ai-marketing-platform/${req.user._id}/${business._id}`,
            public_id: `image_${randomUUID()}`,
            allowed_formats: ALLOWED_IMAGE_FORMATS,
            overwrite: false,
        };

        const signature = createCloudinarySignature(params, apiSecret);

        return res.status(200).json({
            success: true,
            cloudName,
            apiKey,
            signature,
            params,
            maxFileSizeBytes: MAX_IMAGE_SIZE_BYTES,
        });
    } catch (error) {
        console.error("Create image upload signature error:", error.message || error);

        return res.status(500).json({
            success: false,
            message: "Failed to prepare image upload",
        });
    }
};

export {
    createImageUploadSignature,
};
