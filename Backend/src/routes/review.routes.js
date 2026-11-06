import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";
import {
  createReview,
  getApprovedTestimonials,
  getAdminReviews,
  moderateReview,
} from "../controllers/review.controller.js";

const router = express.Router();

// Public customer feedback submission.
router.post("/", createReview);

// Public endpoint returns approved testimonials only.
router.get("/business/:businessId", getApprovedTestimonials);

// Admin-only moderation endpoints.
router.get("/admin", authMiddleware, adminMiddleware, getAdminReviews);
router.patch(
  "/:reviewId/moderation",
  authMiddleware,
  adminMiddleware,
  moderateReview
);

export default router;
