import mongoose from "mongoose";

const socialAccountSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    platform: {
      type: String,
      enum: ["google_business", "instagram", "facebook"],
      required: true,
      trim: true,
    },

    platformAccountId: {
      type: String,
      required: true,
      trim: true,
    },

    accountName: {
      type: String,
      trim: true,
      default: null,
    },

    accessToken: {
      type: String,
      default: null,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    tokenExpiresAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["connected", "disconnected", "expired"],
      default: "connected",
    },

    connectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SocialAccount = mongoose.model(
  "SocialAccount",
  socialAccountSchema
);

export default SocialAccount;