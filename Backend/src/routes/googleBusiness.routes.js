import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  disconnectGoogleBusiness,
  getGoogleBusinessConnection,
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
  googleBusinessOAuthCallback,
  startGoogleBusinessConnection,
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
router.delete("/connection", disconnectGoogleBusiness);

export default router;
