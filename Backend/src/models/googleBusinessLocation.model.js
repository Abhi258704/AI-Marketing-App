import mongoose from "mongoose";

const googleBusinessLocationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    googleAccountName: {
      type: String,
      required: true,
      trim: true,
    },
    googleLocationName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    locationTitle: { type: String, required: true, trim: true },
    storeCode: { type: String, trim: true, default: null },
    websiteUri: { type: String, trim: true, default: null },
    phoneNumbers: { type: mongoose.Schema.Types.Mixed, default: null },
    storefrontAddress: { type: mongoose.Schema.Types.Mixed, default: null },
    categories: { type: mongoose.Schema.Types.Mixed, default: null },
    mappedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const GoogleBusinessLocation = mongoose.model(
  "GoogleBusinessLocation",
  googleBusinessLocationSchema
);

export default GoogleBusinessLocation;
