import mongoose from "mongoose";
import Business from "../models/business.model.js";
import GoogleBusinessLocation from "../models/googleBusinessLocation.model.js";
import { generateGoogleReviewReply } from "../services/google-review-reply.service.js";

export async function generateGoogleBusinessReviewReplyDraft(req, res) {
  try {
    const { businessId, reviewId } = req.params;
    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({ message: "Invalid business ID." });
    }

    const business = await Business.findOne({
      _id: businessId,
      ownerId: req.user._id,
      isActive: true,
    });
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    const mapping = await GoogleBusinessLocation.findOne({
      businessId: business._id,
      userId: req.user._id,
    });
    if (!mapping) {
      return res.status(409).json({
        message: "Link a Google Business location to this business first.",
      });
    }

    const { reviewerName = "", rating, comment = "" } = req.body || {};
    const normalizedRating = Number(rating);
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";

    if (!reviewId || reviewId.length > 512) {
      return res.status(400).json({ message: "A valid Google review ID is required." });
    }
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: "Review rating must be between 1 and 5." });
    }
    if (typeof comment !== "string" || normalizedComment.length > 5000) {
      return res.status(400).json({ message: "Review text must be 5,000 characters or fewer." });
    }
    if (typeof reviewerName !== "string" || reviewerName.length > 120) {
      return res.status(400).json({ message: "Invalid reviewer name." });
    }

    const reply = await generateGoogleReviewReply({
      businessName: business.name,
      businessCategory: business.category,
      businessDescription: business.description,
      reviewerName: reviewerName.trim(),
      rating: normalizedRating,
      reviewComment: normalizedComment,
    });

    return res.status(200).json({
      reviewId,
      reply,
      status: "draft",
      message: "AI reply draft generated. Review and edit it before publishing.",
    });
  } catch (error) {
    console.error("Generate Google review reply draft error:", error.message);
    return res.status(502).json({
      message: error.message || "Could not generate a review reply. Please try again.",
    });
  }
}
