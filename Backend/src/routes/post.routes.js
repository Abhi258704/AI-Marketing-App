import express from "express";
import {
    createPost,
    getMyPosts,
    getPostById,
    updatePost,
    deletePost,
    schedulePost,
    cancelScheduledPost,
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

router.patch(
    "/:postId/schedule",
    authMiddleware,
    schedulePost
);

router.patch(
    "/:postId/cancel",
    authMiddleware,
    cancelScheduledPost
);



export default router;