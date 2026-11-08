import mongoose from "mongoose";

const searchConsolePropertySchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: "SearchConsoleConnection", required: true },
  siteUrl: { type: String, required: true },
  permissionLevel: { type: String, required: true },
  selectedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const SearchConsoleProperty = mongoose.model("SearchConsoleProperty", searchConsolePropertySchema);
export default SearchConsoleProperty;
