import mongoose from "mongoose";

const aiImageUsageSchema = new mongoose.Schema(
    {
        scope: {
            type: String,
            enum: ["global", "user"],
            required: true,
        },
        scopeId: {
            type: String,
            required: true,
        },
        dayKey: {
            type: String,
            required: true,
        },
        count: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

aiImageUsageSchema.index(
    { scope: 1, scopeId: 1, dayKey: 1 },
    { unique: true }
);
aiImageUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AiImageUsage = mongoose.model("AiImageUsage", aiImageUsageSchema);

export default AiImageUsage;
