import PostPublication from "../models/postPublication.model.js";
import Post from "../models/post.model.js";
import SocialAccount from "../models/socialAccount.model.js";
import Business from "../models/business.model.js";



const createPublication = async (req, res) => {
    try {
        const {
            postId,
            socialAccountId,
        } = req.body;

        if (!postId || !socialAccountId) {
            return res.status(400).json({
                success: false,
                message: "postId and socialAccountId are required",
            });
        }

        const post = await Post.findById(postId);

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
            _id: socialAccountId,
            businessId: post.businessId,
            status: "connected",
        });

        if (!socialAccount) {
            return res.status(404).json({
                success: false,
                message: "Social account not found or not connected",
            });
        }

        const existingPublication = await PostPublication.findOne({
            postId,
            socialAccountId,
        });

        if (existingPublication) {
            return res.status(409).json({
                success: false,
                message: "Publication already exists for this social account",
                publication: existingPublication,
            });
        }

        const publication = await PostPublication.create({
            postId,
            socialAccountId,
            platform: socialAccount.platform,
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            message: "Publication created successfully",
            publication,
        });
    } catch (error) {
        console.error("Create publication error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create publication",
        });
    }
};




export {
    createPublication,
};