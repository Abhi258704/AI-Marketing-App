import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createSocialAccount,
  getBusinessSocialAccounts,
} from "../controllers/socialAccount.controller.js";





const router = express.Router();


router.post("/", authMiddleware, createSocialAccount);
router.get(
  "/business/:businessId",
  authMiddleware,
  getBusinessSocialAccounts
);





export default router;