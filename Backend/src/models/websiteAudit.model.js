import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
  code: { type: String, required: true },
  category: { type: String, enum: ["technical", "on-page", "content", "performance"], default: "technical" },
  severity: { type: String, enum: ["critical", "high", "medium", "low"], required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  evidence: { type: String, default: "" },
  recommendation: { type: String, default: "" },
  pageUrl: { type: String, default: null },
  status: { type: String, enum: ["open", "in_progress", "resolved", "ignored"], default: "open" },
}, { _id: false });

const pageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  finalUrl: { type: String, default: null },
  statusCode: { type: Number, default: 0 },
  contentType: { type: String, default: "" },
  title: { type: String, default: "" },
  titleLength: { type: Number, default: 0 },
  metaDescription: { type: String, default: "" },
  descriptionLength: { type: Number, default: 0 },
  canonical: { type: String, default: null },
  metaRobots: { type: String, default: "" },
  h1Count: { type: Number, default: 0 },
  h1Text: [{ type: String }],
  h2Count: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  imageCount: { type: Number, default: 0 },
  imagesMissingAlt: { type: Number, default: 0 },
  hasViewport: { type: Boolean, default: false },
  internalLinkCount: { type: Number, default: 0 },
  externalLinkCount: { type: Number, default: 0 },
  structuredDataCount: { type: Number, default: 0 },
  responseTimeMs: { type: Number, default: null },
  internalLinks: [{ type: String }],
}, { _id: false });

const websiteAuditSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  website: { type: String, required: true },
  domain: { type: String, required: true },
  status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued", index: true },
  maxPages: { type: Number, default: 100 },
  pageCount: { type: Number, default: 0 },
  discoveredUrlCount: { type: Number, default: 0 },
  issueCount: { type: Number, default: 0 },
  severityCounts: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
  },
  score: { type: Number, default: null },
  scoreMethod: { type: String, default: "internal_technical_heuristic_v1" },
  pages: { type: [pageSchema], default: [] },
  issues: { type: [issueSchema], default: [] },
  performance: { type: mongoose.Schema.Types.Mixed, default: null },
  sitemapFound: { type: Boolean, default: false },
  robotsTxtFound: { type: Boolean, default: false },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  errorMessage: { type: String, default: null },
}, { timestamps: true });

websiteAuditSchema.index({ businessId: 1, createdAt: -1 });
websiteAuditSchema.index({ status: 1, createdAt: 1 });

const WebsiteAudit = mongoose.model("WebsiteAudit", websiteAuditSchema);
export default WebsiteAudit;
