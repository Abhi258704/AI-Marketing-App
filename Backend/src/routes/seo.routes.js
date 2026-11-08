import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createWebsiteAudit, getWebsiteAudit, listWebsiteAudits } from "../controllers/seo.controller.js";

const router = express.Router();
router.use(authMiddleware);
router.post("/businesses/:businessId/audits", createWebsiteAudit);
router.get("/businesses/:businessId/audits", listWebsiteAudits);
router.get("/audits/:auditId", getWebsiteAudit);
export default router;
