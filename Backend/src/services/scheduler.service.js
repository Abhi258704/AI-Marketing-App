import Post from "../models/post.model.js";
import Business from "../models/business.model.js";
import SocialAccount from "../models/socialAccount.model.js";
import PostPublication from "../models/postPublication.model.js";
import { createFacebookPost } from "./facebook.service.js";
import {
    createInstagramMediaContainer,
    publishInstagramMediaContainer,
    getInstagramMediaContainerStatus,
} from "./instagram.service.js";

const processScheduledPosts = async () => {
    try {
        const posts = await Post.find({
            status: "scheduled",
            scheduledAt: { $lte: new Date() },
        });

        if (posts.length === 0) {
            return;
        }

        console.log(`Found ${posts.length} scheduled post(s)`);

        for (const post of posts) {
            try {
                post.status = "processing";
                await post.save();

                const business = await Business.findOne({
                    _id: post.businessId,
                    isActive: true,
                });

                if (!business) {
                    post.status = "failed";
                    await post.save();
                    continue;
                }

                const socialAccounts = await SocialAccount.find({
                    businessId: business._id,
                    platform: {
                        $in: ["facebook", "instagram"],
                    },
                    status: "connected",
                });

                for (const socialAccount of socialAccounts) {
                    let publication = await PostPublication.findOne({
                        postId: post._id,
                        socialAccountId: socialAccount._id,
                    });

                    if (!publication) {
                        publication = await PostPublication.create({
                            postId: post._id,
                            socialAccountId: socialAccount._id,
                            platform: socialAccount.platform,
                            status: "pending",
                        });
                    }

                    if (publication.status === "published") {
                        continue;
                    }

                    try {
                        publication.status = "publishing";
                        publication.attemptCount += 1;
                        await publication.save();

                        if (socialAccount.platform === "facebook") {
                            const result = await createFacebookPost({
                                pageId: socialAccount.platformAccountId,
                                pageAccessToken: socialAccount.accessToken,
                                message: post.content,
                            });

                            publication.status = "published";
                            publication.externalPostId = result.id;
                        }

                        if (socialAccount.platform === "instagram") {
                            if (
                                !post.mediaUrls ||
                                post.mediaUrls.length === 0
                            ) {
                                throw new Error(
                                    "Instagram requires at least one media URL"
                                );
                            }

                            const container =
                                await createInstagramMediaContainer({
                                    instagramAccountId:
                                        socialAccount.platformAccountId,
                                    accessToken:
                                        socialAccount.accessToken,
                                    imageUrl: post.mediaUrls[0],
                                    caption: post.content,
                                });

                            let containerStatus = null;

                            for (let attempt = 0; attempt < 10; attempt++) {
                                containerStatus =
                                    await getInstagramMediaContainerStatus({
                                        containerId: container.id,
                                        accessToken:
                                            socialAccount.accessToken,
                                    });

                                if (
                                    containerStatus.status_code === "FINISHED"
                                ) {
                                    break;
                                }

                                if (
                                    containerStatus.status_code === "ERROR" ||
                                    containerStatus.status_code === "EXPIRED"
                                ) {
                                    throw new Error(
                                        containerStatus.status ||
                                        "Instagram media container failed"
                                    );
                                }

                                await new Promise((resolve) =>
                                    setTimeout(resolve, 2000)
                                );
                            }

                            if (
                                containerStatus?.status_code !== "FINISHED"
                            ) {
                                throw new Error(
                                    "Instagram media container is not ready"
                                );
                            }

                            const result =
                                await publishInstagramMediaContainer({
                                    instagramAccountId:
                                        socialAccount.platformAccountId,
                                    accessToken:
                                        socialAccount.accessToken,
                                    containerId: container.id,
                                });

                            publication.status = "published";
                            publication.externalPostId = result.id;
                        }

                        publication.errorCode = null;
                        publication.errorMessage = null;
                        publication.publishedAt = new Date();

                        await publication.save();
                    } catch (error) {
                        publication.status = "failed";
                        publication.errorCode =
                            error.response?.data?.error?.code?.toString() ||
                            null;
                        publication.errorMessage =
                            error.response?.data?.error?.message ||
                            error.message ||
                            "Scheduled publishing failed";

                        await publication.save();

                        console.error(
                            `Failed to publish scheduled post ${post._id} to ${socialAccount.platform}:`,
                            error.message
                        );
                    }
                }

                const publications = await PostPublication.find({
                    postId: post._id,
                });

                const allPublished =
                    publications.length > 0 &&
                    publications.every(
                        (publication) => publication.status === "published"
                    );

                if (allPublished) {
                    post.status = "published";
                    await post.save();
                }
            } catch (error) {
                console.error(
                    `Failed to process scheduled post ${post._id}:`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error(
            "Scheduled post processor error:",
            error.message || error
        );
    }
};

export {
    processScheduledPosts,
};