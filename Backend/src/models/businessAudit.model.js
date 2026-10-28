
import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            enum: ["profile", "reviews", "content", "seo", "general"],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
    },
    { _id: false }
);

const businessAuditSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true,
        },
        overallScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        profileScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        reviewScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        contentScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        seoScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        issues: {
            type: [issueSchema],
            default: [],
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    }
);

const BusinessAudit = mongoose.model(
    "BusinessAudit",
    businessAuditSchema
);

export default BusinessAudit;
