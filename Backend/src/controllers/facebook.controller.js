import {
    exchangeFacebookCode,
    getFacebookPages,
    createFacebookPost,
} from "../services/facebook.service.js";
import SocialAccount from "../models/socialAccount.model.js";
import PostPublication from "../models/postPublication.model.js";
import Post from "../models/post.model.js";
import Business from "../models/business.model.js";




const connectFacebook = async (req, res) => {
    try {
        const { businessId } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: "businessId is required",
            });
        }

        const facebookAuthUrl =
            `https://www.facebook.com/dialog/oauth?` +
            new URLSearchParams({
                client_id: process.env.FACEBOOK_APP_ID,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                response_type: "code",
                scope: "pages_show_list,pages_manage_posts,pages_read_engagement",
                state: businessId,
            }).toString();

        return res.status(200).json({
            success: true,
            authUrl: facebookAuthUrl,
        });
    } catch (error) {
        console.error("Facebook connect error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to start Facebook connection",
        });
    }
};

const facebookCallback = async (req, res) => {
    try {
        const { code, error, error_description, state } = req.query;

        if (error) {
            return res.status(400).json({
                success: false,
                message: error_description || "Facebook authorization failed",
            });
        }

        if (!state) {
            return res.status(400).json({
                success: false,
                message: "businessId is missing from Facebook OAuth state",
            });
        }

        const businessId = state;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Facebook authorization code is missing",
            });
        }

        const tokenData = await exchangeFacebookCode(code);

        const pages = await getFacebookPages(tokenData.access_token);

        const page = pages.data?.[0];

        if (!page) {
            return res.status(400).json({
                success: false,
                message: "No Facebook Page found",
            });
        }

        const socialAccount = await SocialAccount.findOneAndUpdate(
            {
                businessId,
                platform: "facebook",
                platformAccountId: page.id,
            },
            {
                businessId,
                platform: "facebook",
                platformAccountId: page.id,
                accountName: page.name,
                accessToken: page.access_token,
                status: "connected",
                connectedAt: new Date(),
            },
            {
                new: true,
                upsert: true,
            }
        );

        return res.status(200).json({
            success: true,
            message: "Facebook Page connected successfully",
            businessId,
            socialAccount: {
                id: socialAccount._id,
                platform: socialAccount.platform,
                platformAccountId: socialAccount.platformAccountId,
                accountName: socialAccount.accountName,
                status: socialAccount.status,
                connectedAt: socialAccount.connectedAt,
            },
        });
    } catch (error) {
        console.error(
            "Facebook callback error:",
            error.response?.data || error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to exchange Facebook authorization code",
        });
    }
};

const publishFacebookPost = async (req, res) => {
    try {
        const { publicationId } = req.params;

        if (!publicationId) {
            return res.status(400).json({
                success: false,
                message: "publicationId is required",
            });
        }

        // 1. Get publication
        const publication = await PostPublication.findById(publicationId);

        if (!publication) {
            return res.status(404).json({
                success: false,
                message: "Post publication not found",
            });
        }

        // 2. Make sure this is a Facebook publication
        if (publication.platform !== "facebook") {
            return res.status(400).json({
                success: false,
                message: "Publication platform is not Facebook",
            });
        }

        // 3. Allow publishing only when pending/failed
        if (!["pending", "failed"].includes(publication.status)) {
            return res.status(400).json({
                success: false,
                message: `Publication cannot be published from status: ${publication.status}`,
            });
        }

        // 4. Get post
        const post = await Post.findById(publication.postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // 5. Verify business ownership
        const business = await Business.findOne({
            _id: post.businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this business",
            });
        }

        // 6. Get connected Facebook account
        const socialAccount = await SocialAccount.findOne({
            _id: publication.socialAccountId,
            businessId: business._id,
            platform: "facebook",
            status: "connected",
        });

        if (!socialAccount) {
            return res.status(404).json({
                success: false,
                message: "Connected Facebook Page not found",
            });
        }

        // 7. Mark as publishing
        publication.status = "publishing";
        publication.attemptCount += 1;
        await publication.save();

        // 8. Publish to Facebook
        const result = await createFacebookPost({
            pageId: socialAccount.platformAccountId,
            pageAccessToken: socialAccount.accessToken,
            message: post.content,
        });

        // 9. Mark as published
        publication.status = "published";
        publication.externalPostId = result.id;
        publication.errorCode = null;
        publication.errorMessage = null;
        publication.publishedAt = new Date();

        await publication.save();

        return res.status(200).json({
            success: true,
            message: "Facebook post published successfully",
            publication,
        });
    } catch (error) {
        console.error(
            "Facebook publish error:",
            error.response?.data || error.message || error
        );

        // Try to mark publication as failed
        if (req.params.publicationId) {
            await PostPublication.findByIdAndUpdate(
                req.params.publicationId,
                {
                    status: "failed",
                    errorCode:
                        error.response?.data?.error?.code?.toString() || null,
                    errorMessage:
                        error.response?.data?.error?.message ||
                        error.message ||
                        "Facebook publishing failed",
                }
            );
        }

        return res.status(500).json({
            success: false,
            message: "Failed to publish Facebook post",
        });
    }
};



export {
    connectFacebook,
    facebookCallback,
    publishFacebookPost,
};