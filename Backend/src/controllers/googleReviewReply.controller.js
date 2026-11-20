import mongoose from "mongoose";
import Business from "../models/business.model.js";
import GoogleBusinessLocation from "../models/googleBusinessLocation.model.js";
import GoogleReviewReplyDraft from "../models/googleReviewReplyDraft.model.js";
import { generateGoogleReviewReply } from "../services/google-review-reply.service.js";

async function getReviewReplyContext(businessId, userId) {
  if (!mongoose.isValidObjectId(businessId)) {
    return { error: { status: 400, message: "Invalid business ID." } };
  }

  const business = await Business.findOne({
    _id: businessId,
    ownerId: userId,
    isActive: true,
  });
  if (!business) {
    return { error: { status: 404, message: "Business not found." } };
  }

  const mapping = await GoogleBusinessLocation.findOne({
    businessId: business._id,
    userId,
  });
  if (!mapping) {
    return {
      error: {
        status: 409,
        message: "Link a Google Business location to this business first.",
      },
    };
  }

  return { business, mapping };
}

function validateReviewInput(reviewId, body = {}) {
  const { reviewerName = "", rating, comment = "" } = body;
  const normalizedRating = Number(rating);
  const normalizedComment = typeof comment === "string" ? comment.trim() : "";

  if (typeof reviewId !== "string" || !reviewId || reviewId.length > 512) {
    return { error: "A valid Google review ID is required." };
  }
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return { error: "Review rating must be between 1 and 5." };
  }
  if (typeof comment !== "string" || normalizedComment.length > 5000) {
    return { error: "Review text must be 5,000 characters or fewer." };
  }
  if (typeof reviewerName !== "string" || reviewerName.trim().length > 120) {
    return { error: "Invalid reviewer name." };
  }

  return {
    reviewerName: reviewerName.trim(),
    rating: normalizedRating,
    reviewComment: normalizedComment,
  };
}

export async function listGoogleBusinessReviewReplyDrafts(req, res) {
  try {
    const context = await getReviewReplyContext(req.params.businessId, req.user._id);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const drafts = await GoogleReviewReplyDraft.find({
      userId: req.user._id,
      businessId: context.business._id,
      googleLocationName: context.mapping.googleLocationName,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      drafts: drafts.map(({ reviewId, reply, status, updatedAt, reviewerName }) => ({
        reviewId,
        reply,
        status,
        updatedAt,
        reviewerName,
      })),
    });
  } catch (error) {
    console.error("List Google review reply drafts error:", error.message);
    return res.status(500).json({ message: "Could not load saved reply drafts." });
  }
}

export async function generateGoogleBusinessReviewReplyDraft(req, res) {
  try {
    const context = await getReviewReplyContext(req.params.businessId, req.user._id);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const input = validateReviewInput(req.params.reviewId, req.body);
    if (input.error) return res.status(400).json({ message: input.error });

    const reply = await generateGoogleReviewReply({
      businessName: context.business.name,
      businessCategory: context.business.category,
      businessDescription: context.business.description,
      reviewerName: input.reviewerName,
      rating: input.rating,
      reviewComment: input.reviewComment,
    });

    const draft = await GoogleReviewReplyDraft.findOneAndUpdate(
      {
        userId: req.user._id,
        businessId: context.business._id,
        reviewId: req.params.reviewId,
      },
      {
        $set: {
          googleLocationName: context.mapping.googleLocationName,
          reviewerName: input.reviewerName,
          rating: input.rating,
          reviewComment: input.reviewComment,
          reply,
          status: "draft",
          generatedByAI: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      reviewId: draft.reviewId,
      reply: draft.reply,
      status: draft.status,
      updatedAt: draft.updatedAt,
      message: "AI reply draft generated and saved. Review and edit it before publishing.",
    });
  } catch (error) {
    console.error("Generate Google review reply draft error:", error.message);
    return res.status(502).json({
      message: error.message || "Could not generate a review reply. Please try again.",
    });
  }
}

export async function saveGoogleBusinessReviewReplyDraft(req, res) {
  try {
    const context = await getReviewReplyContext(req.params.businessId, req.user._id);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const reply = typeof req.body?.reply === "string" ? req.body.reply.trim() : "";
    if (!reply || reply.length > 1500) {
      return res.status(400).json({ message: "Reply must contain 1–1,500 characters." });
    }

    const draft = await GoogleReviewReplyDraft.findOneAndUpdate(
      {
        userId: req.user._id,
        businessId: context.business._id,
        googleLocationName: context.mapping.googleLocationName,
        reviewId: req.params.reviewId,
      },
      { $set: { reply, status: "draft", generatedByAI: false } },
      { new: true, runValidators: true }
    );

    if (!draft) {
      return res.status(404).json({ message: "Generate a reply draft before saving your edits." });
    }

    return res.status(200).json({
      reviewId: draft.reviewId,
      reply: draft.reply,
      status: draft.status,
      updatedAt: draft.updatedAt,
      message: "Reply draft saved.",
    });
  } catch (error) {
    console.error("Save Google review reply draft error:", error.message);
    return res.status(500).json({ message: "Could not save the reply draft." });
  }
}
