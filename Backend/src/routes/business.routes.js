import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  toggleBusinessStatus,
} from "../controllers/business.controller.js";




const router = express.Router();



router.post("/", authMiddleware, createBusiness);
router.get("/", authMiddleware, getMyBusinesses);
router.get("/:businessId", authMiddleware, getBusinessById);
router.patch("/:businessId", authMiddleware, updateBusiness);
router.patch(
  "/:businessId/status",
  authMiddleware,
  toggleBusinessStatus
);






export default router;