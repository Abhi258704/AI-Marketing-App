import { generateMarketingContent } from "../services/ai.service.js";







const generateContent = async (req, res) => {
    try {
        const {
            businessName,
            platform,
            topic,
            goal,
            tone,
        } = req.body;

        if (!businessName || !platform || !topic) {
            return res.status(400).json({
                success: false,
                message: "businessName, platform and topic are required",
            });
        }

        const prompt = `
You are an AI marketing assistant.

Create marketing content for the following business:

Business Name: ${businessName}
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
`;

        const content = await generateMarketingContent(prompt);

        return res.status(200).json({
            success: true,
            content,
        });
    } catch (error) {
        console.error("AI content generation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate marketing content",
        });
    }
};








export {
    generateContent,
};