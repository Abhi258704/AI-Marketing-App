
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            default: null,
        },
        type: {
            type: String,
            enum: [
                "post_published",
                "post_failed",
                "post_partially_published",
                "audit_completed",
                "recommendation_completed",
                "general",
            ],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;
