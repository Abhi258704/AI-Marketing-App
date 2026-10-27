import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { publishPost } from "../controllers/publish.controller.js";

const router = express.Router();

router.post("/", authMiddleware, publishPost);

export default router;