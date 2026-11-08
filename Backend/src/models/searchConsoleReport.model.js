import mongoose from "mongoose";

const metricRowSchema = new mongoose.Schema({
  key: { type: String, default: "" },
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  position: { type: Number, default: 0 },
}, { _id: false });

const dailyRowSchema = new mongoose.Schema({
  date: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  position: { type: Number, default: 0 },
}, { _id: false });

const searchConsoleReportSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  siteUrl: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  totals: { type: metricRowSchema, default: () => ({}) },
  daily: { type: [dailyRowSchema], default: [] },
  queries: { type: [metricRowSchema], default: [] },
  pages: { type: [metricRowSchema], default: [] },
  countries: { type: [metricRowSchema], default: [] },
  devices: { type: [metricRowSchema], default: [] },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

searchConsoleReportSchema.index({ businessId: 1, startDate: 1, endDate: 1 }, { unique: true });
searchConsoleReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SearchConsoleReport = mongoose.model("SearchConsoleReport", searchConsoleReportSchema);
export default SearchConsoleReport;
