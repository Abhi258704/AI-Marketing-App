import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    getAuditRecommendations,
    updateRecommendationStatus,
} from "../controllers/recommendation.controller.js";

const router = express.Router();

router.get(
    "/audit/:auditId",
    authMiddleware,
    getAuditRecommendations
);

router.patch(
    "/:recommendationId/status",
    authMiddleware,
    updateRecommendationStatus
);

export default router;