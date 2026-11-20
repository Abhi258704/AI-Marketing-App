import { generateMarketingContent } from "./ai.service.js";

export async function generateGoogleReviewReply({
  businessName,
  businessCategory,
  businessDescription,
  reviewerName,
  rating,
  reviewComment,
}) {
  const prompt = `
You write thoughtful, professional owner responses to Google Business Profile reviews.

Create one concise, natural reply to the customer review below.

Business context:
- Business name: ${businessName}
- Category: ${businessCategory || "Not specified"}
- Description: ${businessDescription || "Not provided"}

Customer review:
- Reviewer: ${reviewerName || "Customer"}
- Star rating: ${rating} out of 5
- Review text: ${reviewComment || "The customer left a rating without written comments."}

Rules:
- Return valid JSON only, with exactly one key: "reply".
- Reply in the same language as the review when it is clear; otherwise use English.
- Be warm, respectful, specific to the review, and concise (roughly 35–80 words).
- For positive feedback, thank the customer without sounding repetitive.
- For negative feedback, acknowledge the concern, apologize for the experience where appropriate, and invite the customer to contact the business privately to resolve it.
- Never argue, blame the customer, reveal private information, offer compensation, make promises, or invent facts about what happened.
- Do not mention that you are an AI.
- Do not include a rating request or promotional sales pitch.
`;

  const result = await generateMarketingContent(prompt);
  const reply = typeof result?.reply === "string" ? result.reply.trim() : "";

  if (!reply || reply.length > 1500) {
    throw new Error("The AI did not return a valid review reply. Please try again.");
  }

  return reply;
}
