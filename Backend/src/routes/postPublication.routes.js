import express from "express";
import { createPublication } from "../controllers/postPublication.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";




const router = express.Router();


router.post(
    "/",
    authMiddleware,
    createPublication
);




export default router;