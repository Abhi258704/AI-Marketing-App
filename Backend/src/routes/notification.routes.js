import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getMyNotifications);

router.patch(
    "/read-all",
    authMiddleware,
    markAllNotificationsAsRead
);

router.patch(
    "/:notificationId/read",
    authMiddleware,
    markNotificationAsRead
);

export default router;