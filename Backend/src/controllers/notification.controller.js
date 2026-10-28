
import Notification from "../models/notification.model.js";

// Get logged-in user's notifications
const getMyNotifications = async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
            100
        );

        const notifications = await Notification.find({
            userId: req.user._id,
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            isRead: false,
        });

        return res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            notifications,
        });
    } catch (error) {
        console.error("Get notifications error:", error.message || error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
        });
    }
};

// Mark one notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            _id: notificationId,
            userId: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        notification.isRead = true;
        await notification.save();

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification,
        });
    } catch (error) {
        console.error("Mark notification as read error:", error.message || error);

        return res.status(500).json({
            success: false,
            message: "Failed to update notification",
        });
    }
};

// Mark all user's notifications as read
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                userId: req.user._id,
                isRead: false,
            },
            {
                $set: { isRead: true },
            }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Mark all notifications as read error:", error.message || error);

        return res.status(500).json({
            success: false,
            message: "Failed to update notifications",
        });
    }
};

export {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};
