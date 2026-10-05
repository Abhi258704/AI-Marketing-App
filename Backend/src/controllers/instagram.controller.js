import PostPublication from "../models/postPublication.model.js";
import Post from "../models/post.model.js";
import SocialAccount from "../models/socialAccount.model.js";
import Business from "../models/business.model.js";

import {
    createInstagramMediaContainer,
    publishInstagramMediaContainer,
} from "../services/instagram.service.js";







const publishInstagramPost = async (req, res) => {
    try {
        const { publicationId } = req.params;

        const publication = await PostPublication.findById(publicationId);

        if (!publication) {
            return res.status(404).json({
                success: false,
                message: "Publication not found",
            });
        }

        if (publication.platform !== "instagram") {
            return res.status(400).json({
                success: false,
                message: "Publication is not for Instagram",
            });
        }

        if (!["pending", "failed"].includes(publication.status)) {
            return res.status(400).json({
                success: false,
                message: "Publication cannot be retried",
            });
        }
        const post = await Post.findById(publication.postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const business = await Business.findOne({
            _id: post.businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const socialAccount = await SocialAccount.findOne({
            _id: publication.socialAccountId,
            businessId: post.businessId,
            platform: "instagram",
            status: "connected",
        });

        if (!socialAccount) {
            return res.status(404).json({
                success: false,
                message: "Instagram account not found or not connected",
            });
        }

        if (!post.mediaUrls || post.mediaUrls.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Instagram posts require at least one media URL",
            });
        }

        publication.status = "publishing";
        publication.attemptCount += 1;

        await publication.save();

        const container = await createInstagramMediaContainer({
            instagramAccountId: socialAccount.platformAccountId,
            accessToken: socialAccount.accessToken,
            imageUrl: post.mediaUrls[0],
            caption: post.content,
        });

        const publishedMedia = await publishInstagramMediaContainer({
            instagramAccountId: socialAccount.platformAccountId,
            accessToken: socialAccount.accessToken,
            containerId: container.id,
        });

        publication.status = "published";
        publication.externalPostId = publishedMedia.id;
        publication.publishedAt = new Date();
        publication.errorCode = null;
        publication.errorMessage = null;

        await publication.save();

        return res.status(200).json({
            success: true,
            message: "Instagram post published successfully",
            publication,
        });
    } catch (error) {
        console.error(
            "Instagram publishing error:",
            error.response?.data || error.message || error
        );

        const { publicationId } = req.params;

        await PostPublication.findByIdAndUpdate(
            publicationId,
            {
                status: "failed",
                errorCode:
                    error.response?.data?.error?.code?.toString() || null,
                errorMessage:
                    error.response?.data?.error?.message ||
                    error.message ||
                    "Instagram publishing failed",
            }
        );

        return res.status(500).json({
            success: false,
            message: "Failed to publish Instagram post",
        });
    }
};






export {
    publishInstagramPost,
};