import express from "express";
import {
    createPost,
    getMyPosts,
    getPostById,
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




export default router;