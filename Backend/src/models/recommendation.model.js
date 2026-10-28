
import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
    {
        auditId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BusinessAudit",
            required: true,
            index: true,
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
        status: {
            type: String,
            enum: ["pending", "in_progress", "completed"],
            default: "pending",
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Recommendation = mongoose.model(
    "Recommendation",
    recommendationSchema
);

export default Recommendation;
