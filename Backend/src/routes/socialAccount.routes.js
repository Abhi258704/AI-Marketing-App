import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createSocialAccount,
  getBusinessSocialAccounts,
  instagramCallback,
  connectInstagram,
} from "../controllers/socialAccount.controller.js";
import { facebookCallback } from "../controllers/facebook.controller.js";




const router = express.Router();


router.post("/", authMiddleware, createSocialAccount);

router.get(
  "/business/:businessId",
  authMiddleware,
  getBusinessSocialAccounts
);

router.get("/instagram/callback", instagramCallback);

router.get(
  "/instagram/connect",
  authMiddleware,
  connectInstagram
);

router.get("/facebook/callback", facebookCallback);

export default router;