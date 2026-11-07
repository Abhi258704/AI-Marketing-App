import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createImageUploadSignature } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/sign", authMiddleware, createImageUploadSignature);

export default router;
