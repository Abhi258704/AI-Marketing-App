import mongoose from "mongoose";

const encryptedTokenSchema = new mongoose.Schema(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false }
);

const googleBusinessConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    googleEmail: { type: String, trim: true, lowercase: true, default: null },
    googleName: { type: String, trim: true, default: null },
    refreshTokenEncrypted: {
      type: encryptedTokenSchema,
      select: false,
      default: null,
    },
    scopes: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["connected", "disconnected", "reauthorization_required"],
      default: "connected",
    },
    connectedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

const GoogleBusinessConnection = mongoose.model(
  "GoogleBusinessConnection",
  googleBusinessConnectionSchema
);

export default GoogleBusinessConnection;
