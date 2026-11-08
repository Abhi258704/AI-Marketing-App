import mongoose from "mongoose";

const encryptedTokenSchema = new mongoose.Schema({
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
}, { _id: false });

const searchConsoleConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  googleEmail: { type: String, default: null, lowercase: true, trim: true },
  googleName: { type: String, default: null },
  refreshTokenEncrypted: { type: encryptedTokenSchema, required: true, select: false },
  scopes: [{ type: String }],
  status: { type: String, enum: ["connected", "reauthorization_required", "disconnected"], default: "connected", index: true },
  connectedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: null },
  lastError: { type: String, default: null },
}, { timestamps: true });

const SearchConsoleConnection = mongoose.model("SearchConsoleConnection", searchConsoleConnectionSchema);
export default SearchConsoleConnection;
