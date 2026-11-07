import express from "express";
import {
    generateContent,
    generateImage,
    deleteGeneratedImage,
} from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { generateBusinessAudit } from "../controllers/businessAudit.controller.js";


const router = express.Router();

router.post(
    "/generate-content",
    authMiddleware,
    generateContent
);

router.post(
    "/generate-image",
    authMiddleware,
    generateImage
);

router.delete(
    "/generated-image",
    authMiddleware,
    deleteGeneratedImage
);

router.post(
    "/business-audit",
    authMiddleware,
    generateBusinessAudit
);

export default router;