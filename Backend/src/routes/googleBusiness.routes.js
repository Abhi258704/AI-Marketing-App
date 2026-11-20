import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  disconnectGoogleBusiness,
  getGoogleBusinessConnection,
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
  googleBusinessOAuthCallback,
  startGoogleBusinessConnection,
  getGoogleBusinessLocationMapping,
  saveGoogleBusinessLocationMapping,
  deleteGoogleBusinessLocationMapping,
} from "../controllers/googleBusiness.controller.js";

const router = express.Router();

// Google redirects here without the app's Bearer token.
// The callback is protected by a single-use, time-limited OAuth state.
router.get("/callback", googleBusinessOAuthCallback);

router.use(authMiddleware);
router.post("/connect", startGoogleBusinessConnection);
router.get("/connection", getGoogleBusinessConnection);
router.get("/accounts", listGoogleBusinessAccounts);
router.get("/accounts/:accountId/locations", listGoogleBusinessLocations);
router.get("/businesses/:businessId/location", getGoogleBusinessLocationMapping);
router.put("/businesses/:businessId/location", saveGoogleBusinessLocationMapping);
router.delete("/businesses/:businessId/location", deleteGoogleBusinessLocationMapping);
router.delete("/connection", disconnectGoogleBusiness);

export default router;
