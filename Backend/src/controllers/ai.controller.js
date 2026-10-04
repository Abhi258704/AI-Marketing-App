import { generateMarketingContent } from "../services/ai.service.js";
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