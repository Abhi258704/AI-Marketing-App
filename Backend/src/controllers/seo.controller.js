import mongoose from "mongoose";
import Business from "../models/business.model.js";
import WebsiteAudit from "../models/websiteAudit.model.js";
import { normalizeWebsiteUrl } from "../services/seo-audit.service.js";

async function ownedBusiness(businessId, userId) {
  if (!mongoose.isValidObjectId(businessId)) return null;
  return Business.findOne({ _id: businessId, ownerId: userId, isActive: true });
}

export async function createWebsiteAudit(req, res) {
  try {
    const business = await ownedBusiness(req.params.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found." });
    if (!business.website) return res.status(400).json({ message: "Add a website URL to this business profile before running a website audit." });
    let website;
    try { website = normalizeWebsiteUrl(business.website); } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const requestedLimit = Number(req.body?.maxPages || 100);
    const maxPages = Number.isFinite(requestedLimit) ? Math.max(10, Math.min(200, Math.round(requestedLimit))) : 100;

    const activeAudit = await WebsiteAudit.findOne({
      businessId: business._id,
      userId: req.user._id,
      status: { $in: ["queued", "running"] },
    }).select("_id");
    if (activeAudit) {
      return res.status(409).json({
        message: "An audit is already queued or running for this business.",
        auditId: activeAudit._id,
      });
    }

    const utcDayStart = new Date();
    utcDayStart.setUTCHours(0, 0, 0, 0);
    const auditsToday = await WebsiteAudit.countDocuments({
      businessId: business._id,
      userId: req.user._id,
      createdAt: { $gte: utcDayStart },
    });
    if (auditsToday >= 3) {
      return res.status(429).json({
        message: "The free audit limit is 3 runs per business per UTC day. Please try again tomorrow.",
      });
    }
    const audit = await WebsiteAudit.create({
      businessId: business._id,
      userId: req.user._id,
      website,
      domain: new URL(website).hostname,
      maxPages,
      status: "queued",
    });
    return res.status(202).json({
      message: "Website audit queued. You can leave this page; the report will be saved when it completes.",
      audit: { _id: audit._id, website: audit.website, status: audit.status, maxPages: audit.maxPages, createdAt: audit.createdAt },
    });
  } catch (error) {
    console.error("Create website audit error:", error);
    return res.status(500).json({ message: "Could not queue the website audit." });
  }
}

export async function listWebsiteAudits(req, res) {
  try {
    const business = await ownedBusiness(req.params.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found." });
    const audits = await WebsiteAudit.find({ businessId: business._id, userId: req.user._id })
      .select("website domain status maxPages pageCount discoveredUrlCount issueCount severityCounts score performance sitemapFound robotsTxtFound startedAt completedAt errorMessage createdAt")
      .sort({ createdAt: -1 }).limit(10).lean();
    return res.status(200).json({ audits });
  } catch (error) {
    console.error("List website audits error:", error);
    return res.status(500).json({ message: "Could not load website audit history." });
  }
}

export async function getWebsiteAudit(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.auditId)) return res.status(404).json({ message: "Website audit not found." });
    const audit = await WebsiteAudit.findOne({ _id: req.params.auditId, userId: req.user._id }).lean();
    if (!audit) return res.status(404).json({ message: "Website audit not found." });
    const business = await ownedBusiness(audit.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Website audit not found." });
    return res.status(200).json({ audit });
  } catch (error) {
    console.error("Get website audit error:", error);
    return res.status(500).json({ message: "Could not load this website audit." });
  }
}
