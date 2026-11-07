import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { stageTemporaryImage } from "../controllers/upload.controller.js";

const router = express.Router();

// The browser sends file bytes to local staging only. This route does not contact Cloudinary.
router.post(
    "/temp/:businessId",
    authMiddleware,
    express.raw({ type: "*/*", limit: "8mb" }),
    stageTemporaryImage
);

export default router;
