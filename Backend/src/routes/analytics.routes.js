import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    getBusinessAnalytics,
    syncInstagramAnalyticsForBusiness,
    syncFacebookAnalyticsForBusiness,
    getBusinessAnalyticsSummary,
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.get(
    "/business/:businessId",
    authMiddleware,
    getBusinessAnalytics
);

router.post(
    "/business/:businessId/instagram/sync",
    authMiddleware,
    syncInstagramAnalyticsForBusiness
);

router.post(
    "/business/:businessId/facebook/sync",
    authMiddleware,
    syncFacebookAnalyticsForBusiness
);

router.get(
    "/business/:businessId/summary",
    authMiddleware,
    getBusinessAnalyticsSummary
);

export default router;