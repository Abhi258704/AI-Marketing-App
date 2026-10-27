import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    connectFacebook,
    facebookCallback,
     publishFacebookPost,
} from "../controllers/facebook.controller.js";




const router = express.Router();


router.get("/connect", authMiddleware, connectFacebook);

router.get("/callback", facebookCallback);

router.post(
    "/publish/:publicationId",
    authMiddleware,
    publishFacebookPost
);




export default router;