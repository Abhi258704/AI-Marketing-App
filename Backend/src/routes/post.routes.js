import express from "express";
import {
    createPost,
    getMyPosts,
    getPostById,
    updatePost,
    deletePost,
} from "../controllers/post.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";



const router = express.Router();



router.post(
    "/",
    authMiddleware,
    createPost
);

router.get(
    "/",
    authMiddleware,
    getMyPosts
);

router.get(
    "/:postId",
    authMiddleware,
    getPostById
);

router.patch(
    "/:postId",
    authMiddleware,
    updatePost
);

router.delete(
    "/:postId",
    authMiddleware,
    deletePost
);



export default router;