import mongoose from "mongoose";
import Business from "../models/business.model.js";
import GoogleBusinessConnection from "../models/googleBusinessConnection.model.js";
import { decryptGoogleBusinessToken } from "../services/google-business-crypto.service.js";
import { getGoogleBusinessAccessToken, publishGoogleBusinessReviewReply, fetchGoogleBusinessReview } from "../services/google-business.service.js";
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

    const existingDraft = await GoogleReviewReplyDraft.findOne({
      userId: req.user._id,
      businessId: context.business._id,
      googleLocationName: context.mapping.googleLocationName,
      reviewId: req.params.reviewId,
    }).select("status");

    if (existingDraft?.status === "published") {
      return res.status(409).json({ message: "This reply has already been published and cannot be regenerated." });
    }
    if (existingDraft?.status === "publishing") {
      return res.status(409).json({ message: "This reply is currently being published. Refresh before trying again." });
    }

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
        googleLocationName: context.mapping.googleLocationName,
        reviewId: req.params.reviewId,
        status: { $nin: ["published", "publishing"] },
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
    if (error.code === 11000) {
      return res.status(409).json({ message: "This reply was published or is being published. Refresh before making changes." });
    }
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
        status: { $in: ["draft", "approved"] },
      },
      { $set: { reply, generatedByAI: false } },
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

export async function reconcileGoogleBusinessReviewReplyDraft(req, res) {
  try {
    const context = await getReviewReplyContext(req.params.businessId, req.user._id);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const reviewName = req.params.reviewId;
    const expectedPrefix = `${context.mapping.googleAccountName}/${context.mapping.googleLocationName}/reviews/`;
    if (
      typeof reviewName !== "string" ||
      !reviewName.startsWith(expectedPrefix) ||
      !/^[A-Za-z0-9_=-]+$/.test(reviewName.slice(expectedPrefix.length))
    ) {
      return res.status(400).json({ message: "Only a real review from the mapped Google location can be checked." });
    }

    const draft = await GoogleReviewReplyDraft.findOne({
      userId: req.user._id,
      businessId: context.business._id,
      googleLocationName: context.mapping.googleLocationName,
      reviewId: reviewName,
      status: "needs_reconciliation",
    });
    if (!draft) {
      return res.status(404).json({ message: "There is no publishing attempt waiting for reconciliation." });
    }

    const connection = await GoogleBusinessConnection.findOne({
      userId: req.user._id,
      status: "connected",
    }).select("+refreshTokenEncrypted");
    if (!connection) {
      return res.status(409).json({ message: "Reconnect Google Business Profile before checking publication status." });
    }

    const accessToken = await getGoogleBusinessAccessToken(connection, decryptGoogleBusinessToken);
    const review = await fetchGoogleBusinessReview(
      accessToken,
      context.mapping.googleAccountName,
      context.mapping.googleLocationName,
      reviewName
    );

    const currentReply = review.reviewReply?.comment || "";
    if (currentReply.trim() === draft.reply.trim()) {
      draft.status = "published";
      draft.publishedAt = review.reviewReply?.updateTime ? new Date(review.reviewReply.updateTime) : new Date();
      draft.googleReplyUpdateTime = review.reviewReply?.updateTime || null;
      await draft.save();
      return res.status(200).json({
        status: "published",
        reviewReply: review.reviewReply,
        message: "Google confirms that this reply is published.",
      });
    }

    return res.status(200).json({
      status: "needs_reconciliation",
      currentReply,
      message: currentReply
        ? "Google currently shows a different reply. The draft remains locked; check again later before retrying."
        : "Google does not currently show this reply. The draft remains locked; wait briefly and check again before retrying.",
    });
  } catch (error) {
    console.error("Reconcile Google review reply error:", error.response?.data || error.message);
    const status = error.response?.status;
    return res.status(status === 401 ? 401 : status === 403 ? 403 : status === 404 ? 404 : 502).json({
      message: error.response?.data?.error?.message || error.message || "Could not check the Google reply status.",
    });
  }
}

export async function publishGoogleBusinessReviewReplyDraft(req, res) {
  let claimFilter = null;
  try {
    const context = await getReviewReplyContext(req.params.businessId, req.user._id);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const reviewId = req.params.reviewId;
    if (
      typeof reviewId !== "string" ||
      !reviewId.startsWith(`${context.mapping.googleAccountName}/${context.mapping.googleLocationName}/reviews/`) ||
      !/^[A-Za-z0-9_=-]+$/.test(reviewId.split("/").at(-1) || "")
    ) {
      return res.status(400).json({ message: "Only real Google reviews can be published." });
    }

    const draftFilter = {
      userId: req.user._id,
      businessId: context.business._id,
      googleLocationName: context.mapping.googleLocationName,
      reviewId,
    };

    const existingDraft = await GoogleReviewReplyDraft.findOne(draftFilter);

    if (!existingDraft) {
      return res.status(404).json({ message: "Save a reply draft before publishing." });
    }
    if (existingDraft.status === "published") {
      return res.status(409).json({ message: "This reply is already published." });
    }
    if (existingDraft.status === "publishing") {
      return res.status(409).json({ message: "This reply is already being published. Refresh before retrying." });
    }
    if (existingDraft.status === "needs_reconciliation") {
      return res.status(409).json({ message: "Check the reply's status on Google before attempting another publication." });
    }
    if (!existingDraft.reply?.trim() || Buffer.byteLength(existingDraft.reply, "utf8") > 4096) {
      return res.status(400).json({ message: "The saved reply is empty or exceeds Google's 4,096-byte limit." });
    }

    const connection = await GoogleBusinessConnection.findOne({
      userId: req.user._id,
      status: "connected",
    }).select("+refreshTokenEncrypted");
    if (!connection) {
      return res.status(409).json({ message: "Reconnect Google Business Profile before publishing." });
    }

    const accessToken = await getGoogleBusinessAccessToken(
      connection,
      decryptGoogleBusinessToken
    );

    const claimedDraft = await GoogleReviewReplyDraft.findOneAndUpdate(
      { ...draftFilter, status: "draft" },
      { $set: { status: "publishing" } },
      { new: true }
    );
    if (!claimedDraft) {
      return res.status(409).json({ message: "This draft is no longer available to publish. Refresh and try again." });
    }

    // Only this request may release the lock it successfully acquired.
    claimFilter = { _id: claimedDraft._id, status: "publishing" };

    const googleReply = await publishGoogleBusinessReviewReply(
      accessToken,
      context.mapping.googleAccountName,
      context.mapping.googleLocationName,
      reviewId,
      claimedDraft.reply
    );

    claimedDraft.status = "published";
    claimedDraft.publishedAt = googleReply.updateTime ? new Date(googleReply.updateTime) : new Date();
    claimedDraft.googleReplyUpdateTime = googleReply.updateTime || null;
    await claimedDraft.save();

    return res.status(200).json({
      reviewId,
      status: "published",
      publishedAt: claimedDraft.publishedAt,
      reviewReply: googleReply,
      message: "Reply published to Google successfully.",
    });
  } catch (error) {
    const status = error.response?.status;

    // A received HTTP error confirms Google rejected the request. A timeout
    // or network failure is ambiguous, so keep the lock to prevent duplicates.
    if (claimFilter) {
      const nextStatus = status >= 400 && status < 500 ? "draft" : "needs_reconciliation";
      await GoogleReviewReplyDraft.updateOne(
        claimFilter,
        { $set: { status: nextStatus } }
      ).catch((resetError) => {
        console.error("Could not update Google review publishing state:", resetError.message);
      });
    }
    console.error("Publish Google review reply error:", error.response?.data || error.message);
    return res.status(status === 401 ? 401 : status === 403 ? 403 : status === 404 ? 404 : 502).json({
      message:
        error.response?.data?.error?.message ||
        (status === 403
          ? "Google did not allow this reply. Check that the location is verified and the connected account has permission."
          : status === 404
            ? "Google could not find this review. Refresh the reviews list and try again."
            : error.message || "Could not publish the review reply."),
    });
  }
}
