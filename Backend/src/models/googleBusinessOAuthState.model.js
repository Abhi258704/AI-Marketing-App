import mongoose from "mongoose";

const googleBusinessOAuthStateSchema = new mongoose.Schema(
  {
    stateHash: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

googleBusinessOAuthStateSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const GoogleBusinessOAuthState = mongoose.model(
  "GoogleBusinessOAuthState",
  googleBusinessOAuthStateSchema
);

export default GoogleBusinessOAuthState;
