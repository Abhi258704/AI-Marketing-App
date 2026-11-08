import mongoose from "mongoose";

const googleOAuthStateSchema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

googleOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GoogleOAuthState = mongoose.model("GoogleOAuthState", googleOAuthStateSchema);
export default GoogleOAuthState;
