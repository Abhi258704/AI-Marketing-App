import mongoose from "mongoose";
import { generateMarketingContent } from "../services/ai.service.js";
import { generateMarketingImage } from "../services/cloudflare-ai.service.js";
import AiImageUsage from "../models/aiImageUsage.model.js";
import {
    removeTemporaryMedia,
    saveGeneratedTemporaryImage,
} from "../services/media-storage.service.js";
import Business from "../models/business.model.js";





const generateContent = async (req, res) => {
    try {
        const {
            businessId,
            platform,
            topic,
            goal,
            tone,
        } = req.body;

        if (!businessId || !platform || !topic) {
            return res.status(400).json({
                success: false,
                message: "businessId, platform and topic are required",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        const prompt = `
You are an AI marketing assistant.

Create marketing content for this business:

Business Name: ${business.name}
Category: ${business.category || "Not specified"}
Description: ${business.description || "Not specified"}
Address: ${business.address || "Not specified"}
Website: ${business.website || "Not specified"}

Platform: ${platform}
Topic: ${topic}
Marketing Goal: ${goal || "increase engagement"}
Tone: ${tone || "engaging"}

Generate content specifically suitable for ${platform}.

Platform guidelines:

- Instagram:
  - Make the caption engaging and visually appealing.
  - Use emojis naturally.
  - Keep the caption concise enough for social media.
  - Include exactly 5 relevant hashtags.
  - End with a clear call-to-action.

- Facebook:
  - Write a slightly more detailed post.
  - Make it conversational and shareable.
  - Use emojis naturally.
  - Include exactly 5 relevant hashtags.
  - Include a clear call-to-action.

- Google Business:
  - Keep the content professional and local-business focused.
  - Highlight useful information for potential customers.
  - Avoid excessive emojis.
  - Include exactly 5 relevant hashtags.
  - Include a clear call-to-action.
Return ONLY valid JSON in exactly this structure:

{
  "caption": "A ready-to-publish marketing caption",
  "callToAction": "A short and effective call-to-action",
  "hashtags": [
    "#hashtag1",
    "#hashtag2",
    "#hashtag3",
    "#hashtag4",
    "#hashtag5"
  ]
}

Rules:
- Do not use Markdown.
- Do not wrap the JSON in a code block.
- The caption should be natural and engaging.
- The callToAction should be short.
- Provide exactly 5 relevant hashtags.
- Do not use the business website as a registration or booking link unless explicitly requested.
- Do not invent URLs.
- Do not invent business information that was not provided.
`;

        const content = await generateMarketingContent(prompt);

        return res.status(200).json({
            success: true,
            content,
        });
    } catch (error) {
        console.error(
            "AI content generation error:",
            error.response?.data || error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to generate marketing content",
        });
    }
};








export {
    generateContent,
};

const IMAGE_DAILY_GLOBAL_LIMIT = Math.max(
    1,
    Number.parseInt(process.env.CLOUDFLARE_IMAGE_DAILY_GLOBAL_LIMIT || "100", 10) || 100
);
const IMAGE_DAILY_USER_LIMIT = Math.max(
    1,
    Number.parseInt(process.env.CLOUDFLARE_IMAGE_DAILY_USER_LIMIT || "3", 10) || 3
);

const getUtcDayKey = () => new Date().toISOString().slice(0, 10);

async function reserveImageUsage(scope, scopeId, dayKey, limit) {
    const filter = { scope, scopeId, dayKey };
    const updated = await AiImageUsage.findOneAndUpdate(
        { ...filter, count: { $lt: limit } },
        { $inc: { count: 1 } },
        { new: true }
    );

    if (updated) return updated;

    const expiresAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    try {
        return await AiImageUsage.create({
            ...filter,
            count: 1,
            expiresAt,
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }

    // Another request may have created the same quota row concurrently.
    return AiImageUsage.findOneAndUpdate(
        { ...filter, count: { $lt: limit } },
        { $inc: { count: 1 } },
        { new: true }
    );
}

async function releaseImageUsage(scope, scopeId, dayKey) {
    await AiImageUsage.updateOne(
        { scope, scopeId, dayKey, count: { $gt: 0 } },
        { $inc: { count: -1 } }
    );
}

const generateImage = async (req, res) => {
    const dayKey = getUtcDayKey();
    const userId = String(req.user._id);

    try {
        const {
            businessId,
            platform,
            topic,
            visualPrompt,
            caption,
        } = req.body || {};

        if (
            typeof businessId !== "string" ||
            !mongoose.isValidObjectId(businessId) ||
            typeof topic !== "string" ||
            !topic.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid businessId and campaign topic are required",
            });
        }

        if (topic.trim().length > 500) {
            return res.status(400).json({
                success: false,
                message: "The campaign topic must be 500 characters or fewer",
            });
        }

        if (
            visualPrompt !== undefined &&
            (typeof visualPrompt !== "string" || visualPrompt.length > 600)
        ) {
            return res.status(400).json({
                success: false,
                message: "Visual direction must be 600 characters or fewer",
            });
        }

        if (
            caption !== undefined &&
            (typeof caption !== "string" || caption.length > 500)
        ) {
            return res.status(400).json({
                success: false,
                message: "Caption context must be 500 characters or fewer",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        }).select("_id ownerId name category description");

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
            return res.status(503).json({
                success: false,
                message: "Cloudflare image generation is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to Backend/.env.",
            });
        }

        const globalUsage = await reserveImageUsage(
            "global",
            "all-users",
            dayKey,
            IMAGE_DAILY_GLOBAL_LIMIT
        );

        if (!globalUsage) {
            return res.status(429).json({
                success: false,
                code: "GLOBAL_DAILY_IMAGE_LIMIT",
                message: "Today's shared image-generation allowance has been used. Please try again after 00:00 UTC.",
            });
        }

        const userUsage = await reserveImageUsage(
            "user",
            userId,
            dayKey,
            IMAGE_DAILY_USER_LIMIT
        );

        if (!userUsage) {
            await releaseImageUsage("global", "all-users", dayKey);
            return res.status(429).json({
                success: false,
                code: "USER_DAILY_IMAGE_LIMIT",
                message: `You have reached your ${IMAGE_DAILY_USER_LIMIT}-image daily limit. Please try again after 00:00 UTC.`,
            });
        }

        const promptParts = [
            "Create one original, polished commercial marketing image for a small business social media campaign.",
            "Make the composition square and suitable for a social media feed.",
            "Business: " + business.name,
            "Category: " + (business.category || "Not specified"),
            "Business description: " + (business.description || "Not specified").slice(0, 300),
            "Platform: " + (typeof platform === "string" ? platform.slice(0, 40) : "Social media"),
            "Campaign topic: " + topic.trim(),
            "Caption context: " + (typeof caption === "string" && caption.trim() ? caption.trim() : "Not provided"),
            "Visual direction: " + (typeof visualPrompt === "string" && visualPrompt.trim() ? visualPrompt.trim() : "Use a tasteful, professional visual style appropriate for the business."),
            "Use a clear focal point, strong composition, realistic lighting and a considered color palette.",
            "Do not invent prices, discounts, product specifications, addresses or contact information.",
            "Do not add logos, watermarks, QR codes, interface mockups or unnecessary text.",
        ];

        const prompt = promptParts.join("\n").slice(0, 2048);
        const generated = await generateMarketingImage({ prompt });
        const mediaUrl = await saveGeneratedTemporaryImage(
            generated.buffer,
            generated.mimeType,
            business
        );

        return res.status(201).json({
            success: true,
            message: "AI image generated and saved to temporary media storage",
            mediaUrl,
            mimeType: generated.mimeType,
            model: generated.model,
            remainingToday: Math.max(0, IMAGE_DAILY_USER_LIMIT - userUsage.count),
            dailyLimit: IMAGE_DAILY_USER_LIMIT,
        });
    } catch (error) {
        const status = Number(error.status || 0);
        console.error("AI image generation error:", error.message || error);

        if (
            status === 429 ||
            /quota|neuron|daily limit|rate.?limit|capacity/i.test(error.message || "")
        ) {
            return res.status(429).json({
                success: false,
                message: "Cloudflare's free daily AI allowance or temporary rate limit has been reached. Please try again later.",
            });
        }

        if (status === 401 || status === 403) {
            return res.status(503).json({
                success: false,
                message: "Cloudflare rejected the API token. Check that it belongs to this account and has Workers AI permission.",
            });
        }

        return res.status(502).json({
            success: false,
            message: error.message || "Failed to generate an AI image",
        });
    }
};

const deleteGeneratedImage = async (req, res) => {
    try {
        const { businessId, mediaUrl } = req.body || {};

        if (
            typeof businessId !== "string" ||
            !mongoose.isValidObjectId(businessId) ||
            typeof mediaUrl !== "string" ||
            !mediaUrl.startsWith("/temp/")
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid businessId and temporary image reference are required",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        }).select("_id ownerId");

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        await removeTemporaryMedia([mediaUrl], business);
        return res.status(200).json({ success: true, message: "Unused temporary image removed" });
    } catch (error) {
        console.error("Delete generated image error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Could not remove the temporary image",
        });
    }
};

export {
    generateImage,
    deleteGeneratedImage,
};
