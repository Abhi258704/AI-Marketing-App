import Notification from "../models/notification.model.js";

const createNotification = async ({
    userId,
    businessId = null,
    type,
    title,
    message,
}) => {
    try {
        return await Notification.create({
            userId,
            businessId,
            type,
            title,
            message,
        });
    } catch (error) {
        // A notification failure must not break the main operation.
        console.error(
            "Create notification error:",
            error.message || error
        );

        return null;
    }
};

export {
    createNotification,
};