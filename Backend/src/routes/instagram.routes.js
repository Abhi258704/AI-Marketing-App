import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { publishInstagramPost } from "../controllers/instagram.controller.js";

const router = express.Router();

router.post(
    "/publish/:publicationId",
    authMiddleware,
    publishInstagramPost
);

export default router;