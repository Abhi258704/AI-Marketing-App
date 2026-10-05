import mongoose from "mongoose";

const postPublicationSchema = new mongoose.Schema(
    {
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },

        socialAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SocialAccount",
            required: true,
        },

        platform: {
            type: String,
            enum: ["google_business", "instagram", "facebook"],
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "publishing", "published", "failed"],
            default: "pending",
        },

        externalPostId: {
            type: String,
            default: null,
        },

        errorCode: {
            type: String,
            default: null,
        },

        errorMessage: {
            type: String,
            default: null,
        },

        attemptCount: {
            type: Number,
            default: 0,
        },

        publishedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const PostPublication = mongoose.model(
    "PostPublication",
    postPublicationSchema
);

export default PostPublication;