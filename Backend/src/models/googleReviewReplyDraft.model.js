import mongoose from "mongoose";

const googleReviewReplyDraftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    googleLocationName: {
      type: String,
      required: true,
      trim: true,
    },
    reviewId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },
    reviewerName: { type: String, trim: true, maxlength: 120, default: "" },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewComment: { type: String, maxlength: 5000, default: "" },
    reply: { type: String, required: true, trim: true, maxlength: 1500 },
    status: {
      type: String,
      enum: ["draft", "approved", "publishing", "needs_reconciliation", "published"],
      default: "draft",
      index: true,
    },
    generatedByAI: { type: Boolean, default: true },
    publishedAt: { type: Date, default: null },
    googleReplyUpdateTime: { type: String, default: null },
  },
  { timestamps: true }
);

googleReviewReplyDraftSchema.index(
  { userId: 1, businessId: 1, reviewId: 1 },
  { unique: true }
);

const GoogleReviewReplyDraft = mongoose.model(
  "GoogleReviewReplyDraft",
  googleReviewReplyDraftSchema
);

export default GoogleReviewReplyDraft;
