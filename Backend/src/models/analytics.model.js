
import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true,
        },
        metric: {
            type: String,
            required: true,
            trim: true,
        },
        value: {
            type: Number,
            required: true,
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        periodStart: {
            type: Date,
            required: true,
        },
        periodEnd: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    }
);

analyticsSchema.index({
    businessId: 1,
    source: 1,
    metric: 1,
    periodStart: -1,
});

const Analytics = mongoose.model("Analytics", analyticsSchema);

export default Analytics;
