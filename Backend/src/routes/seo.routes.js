import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createWebsiteAudit, getWebsiteAudit, listWebsiteAudits } from "../controllers/seo.controller.js";
import {
  disconnectSearchConsole,
  getSearchConsoleConnection,
  getSearchConsolePerformance,
  listSearchConsoleProperties,
  searchConsoleOAuthCallback,
  selectSearchConsoleProperty,
  startSearchConsoleConnection,
} from "../controllers/searchConsole.controller.js";

const router = express.Router();

// Google redirects here without the app Bearer token. State is single-use and time-limited.
router.get("/search-console/callback", searchConsoleOAuthCallback);

router.use(authMiddleware);
router.post("/search-console/connect", startSearchConsoleConnection);
router.get("/search-console/connection/:businessId", getSearchConsoleConnection);
router.get("/businesses/:businessId/search-console/properties", listSearchConsoleProperties);
router.post("/businesses/:businessId/search-console/property", selectSearchConsoleProperty);
router.get("/businesses/:businessId/search-console/performance", getSearchConsolePerformance);
router.delete("/search-console/connection", disconnectSearchConsole);

router.post("/businesses/:businessId/audits", createWebsiteAudit);
router.get("/businesses/:businessId/audits", listWebsiteAudits);
router.get("/audits/:auditId", getWebsiteAudit);

export default router;
