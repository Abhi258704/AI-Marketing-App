import Post from "../models/post.model.js";
import Business from "../models/business.model.js";



const createPost = async (req, res) => {
    try {
        const {
            businessId,
            title,
            content,
            mediaUrls,
            postType,
        } = req.body;

        if (!businessId || !content) {
            return res.status(400).json({
                success: false,
                message: "businessId and content are required",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        const post = await Post.create({
            businessId,
            title: title || null,
            content,
            mediaUrls: mediaUrls || [],
            postType: postType || "social_post",
            status: "draft",
        });

        return res.status(201).json({
            success: true,
            message: "Post saved as draft",
            post,
        });
    } catch (error) {
        console.error("Create post error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create post",
        });
    }
};

const getMyPosts = async (req, res) => {
    try {
        const businesses = await Business.find({
            ownerId: req.user._id,
        }).select("_id");

        const businessIds = businesses.map((business) => business._id);

        const posts = await Post.find({
            businessId: { $in: businessIds },
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            posts,
        });
    } catch (error) {
        console.error("Get my posts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch posts",
        });
    }
};

const getPostById = async (req, res) => {
    try {
        const { postId } = req.params;

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
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        return res.status(200).json({
            success: true,
            post,
        });
    } catch (error) {
        console.error("Get post by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch post",
        });
    }
};




export {
    createPost,
    getMyPosts,
    getPostById,
};