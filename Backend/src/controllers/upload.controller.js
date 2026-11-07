import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import Business from "../models/business.model.js";
import { TEMP_MEDIA_ROOT } from "../services/media-storage.service.js";

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const stageTemporaryImage = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!businessId || !mongoose.isValidObjectId(businessId)) {
            return res.status(400).json({ success: false, message: "A valid businessId is required" });
        }

        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({ success: false, message: "Choose an image file before uploading" });
        }

        if (req.body.length > MAX_IMAGE_SIZE_BYTES) {
            return res.status(413).json({ success: false, message: "Each image must be 8 MB or smaller" });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        }).select("_id ownerId");

        if (!business) {
            return res.status(404).json({ success: false, message: "Business not found" });
        }

        // Validate the actual file signature instead of trusting the browser MIME type.
        const buffer = req.body;
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

        if (!isPng && !isJpeg) {
            return res.status(415).json({
                success: false,
                message: "Unsupported file. Choose a valid JPG or PNG image.",
            });
        }

        const ownerId = String(req.user._id);
        const ownedBusinessId = String(business._id);
        const folder = path.join(TEMP_MEDIA_ROOT, ownerId, ownedBusinessId);
        const fileName = `${randomUUID()}.${isPng ? "png" : "jpg"}`;

        await fs.mkdir(folder, { recursive: true });
        await fs.writeFile(path.join(folder, fileName), buffer, { flag: "wx" });

        return res.status(201).json({
            success: true,
            message: "Image saved in temporary storage",
            mediaUrl: `/temp/${ownerId}/${ownedBusinessId}/${fileName}`,
            maxFileSizeBytes: MAX_IMAGE_SIZE_BYTES,
        });
    } catch (error) {
        console.error("Stage temporary image error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Could not save the image in temporary storage",
        });
    }
};

export { stageTemporaryImage };
