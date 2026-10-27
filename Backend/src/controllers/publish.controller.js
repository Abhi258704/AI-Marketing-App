import {
    createInstagramMediaContainer,
    publishInstagramMediaContainer,
    getInstagramMediaContainerStatus,
} from "../services/instagram.service.js";
import Post from "../models/post.model.js";
import Business from "../models/business.model.js";
import SocialAccount from "../models/socialAccount.model.js";
import PostPublication from "../models/postPublication.model.js";
import { createFacebookPost } from "../services/facebook.service.js";




const publishPost = async (req, res) => {
    try {
        const { postId, platforms } = req.body;

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "postId is required",
            });
        }

        if (!Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: "platforms must be a non-empty array",
            });
        }

        // 1. Get post
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // 2. Verify business ownership
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

        // 3. Get connected social accounts
        const socialAccounts = await SocialAccount.find({
            businessId: business._id,
            platform: { $in: platforms },
            status: "connected",
        });

        if (socialAccounts.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No connected social accounts found for the selected platforms",
            });
        }

        // 4. Create publications
        const publications = [];

        for (const socialAccount of socialAccounts) {
            const existingPublication = await PostPublication.findOne({
                postId: post._id,
                socialAccountId: socialAccount._id,
            });

            if (existingPublication) {
                publications.push(existingPublication);
                continue;
            }

            const publication = await PostPublication.create({
                postId: post._id,
                socialAccountId: socialAccount._id,
                platform: socialAccount.platform,
                status: "pending",
            });

            publications.push(publication);
        }

        // 5. Publish Facebook posts
        for (const publication of publications) {
            if (publication.platform !== "facebook") {
                continue;
            }

            const socialAccount = socialAccounts.find(
                (account) =>
                    account._id.toString() ===
                    publication.socialAccountId.toString()
            );

            if (!socialAccount) {
                continue;
            }

            try {
                publication.status = "publishing";
                publication.attemptCount += 1;
                await publication.save();

                const result = await createFacebookPost({
                    pageId: socialAccount.platformAccountId,
                    pageAccessToken: socialAccount.accessToken,
                    message: post.content,
                });

                publication.status = "published";
                publication.externalPostId = result.id;
                publication.errorCode = null;
                publication.errorMessage = null;
                publication.publishedAt = new Date();

                await publication.save();
            } catch (error) {
                publication.status = "failed";
                publication.errorCode =
                    error.response?.data?.error?.code?.toString() || null;
                publication.errorMessage =
                    error.response?.data?.error?.message ||
                    error.message ||
                    "Facebook publishing failed";

                await publication.save();
            }
        }

        // 6. Publish Instagram posts
        for (const publication of publications) {
            if (publication.platform !== "instagram") {
                continue;
            }

            const socialAccount = socialAccounts.find(
                (account) =>
                    account._id.toString() ===
                    publication.socialAccountId.toString()
            );

            if (!socialAccount) {
                continue;
            }

            try {
                if (!post.mediaUrls || post.mediaUrls.length === 0) {
                    publication.status = "failed";
                    publication.errorMessage =
                        "Instagram requires at least one media URL";

                    await publication.save();
                    continue;
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

                let containerStatus = null;

                for (let attempt = 0; attempt < 10; attempt++) {
                    containerStatus = await getInstagramMediaContainerStatus({
                        containerId: container.id,
                        accessToken: socialAccount.accessToken,
                    });

                    if (containerStatus.status_code === "FINISHED") {
                        break;
                    }

                    if (
                        containerStatus.status_code === "ERROR" ||
                        containerStatus.status_code === "EXPIRED"
                    ) {
                        throw new Error(
                            containerStatus.status || "Instagram media container failed"
                        );
                    }

                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

                if (containerStatus?.status_code !== "FINISHED") {
                    throw new Error("Instagram media container is not ready");
                }

                const result = await publishInstagramMediaContainer({
                    instagramAccountId: socialAccount.platformAccountId,
                    accessToken: socialAccount.accessToken,
                    containerId: container.id,
                });

                publication.status = "published";
                publication.externalPostId = result.id;
                publication.errorCode = null;
                publication.errorMessage = null;
                publication.publishedAt = new Date();

                await publication.save();
            } catch (error) {
                publication.status = "failed";
                publication.errorCode =
                    error.response?.data?.error?.code?.toString() || null;
                publication.errorMessage =
                    error.response?.data?.error?.message ||
                    error.message ||
                    "Instagram publishing failed";

                await publication.save();
            }
        }

        return res.status(201).json({
            success: true,
            message: "Post publications created successfully",
            publications,
        });
    } catch (error) {
        console.error(
            "Publish post error:",
            error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create post publications",
        });
    }
};







export {
    publishPost,
};