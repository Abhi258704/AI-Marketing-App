import express from "express";
import { generateContent } from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";



const router = express.Router();

router.post(
    "/generate-content",
    authMiddleware,
    generateContent
);

export default router;