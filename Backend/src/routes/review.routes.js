import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
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

// Signed-in business owners can moderate their own businesses.
// Platform admins can moderate across all businesses.
router.get("/manage", authMiddleware, getAdminReviews);
router.patch("/:reviewId/moderation", authMiddleware, moderateReview);

export default router;
