import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
        },

        title: {
            type: String,
            trim: true,
            default: null,
        },

        content: {
            type: String,
            required: true,
            trim: true,
        },

        mediaUrls: {
            type: [String],
            default: [],
        },

        postType: {
            type: String,
            enum: ["social_post", "advertisement"],
            default: "social_post",
        },

        status: {
            type: String,
            enum: ["draft", "scheduled", "published", "failed"],
            default: "draft",
        },

        scheduledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Post = mongoose.model("Post", postSchema);

export default Post;