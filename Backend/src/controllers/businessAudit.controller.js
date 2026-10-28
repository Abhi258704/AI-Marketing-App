import Business from "../models/business.model.js";
import { runBusinessAudit } from "../services/businessAudit.service.js";
import { createNotification } from "../services/notification.service.js";




const generateBusinessAudit = async (req, res) => {
    try {
        const { businessId } = req.body;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: "businessId is required",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        const result = await runBusinessAudit(business);

        await createNotification({
            userId: req.user._id,
            businessId: business._id,
            type: "audit_completed",
            title: "Business audit completed",
            message: `Your AI business audit for "${business.name}" is ready.`,
        });

        return res.status(201).json({
            success: true,
            message: "Business audit completed successfully",
            audit: result.audit,
            recommendations: result.recommendations,
        });
    } catch (error) {
        console.error(
            "Business audit generation error:",
            error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to generate business audit",
        });
    }
};




export {
    generateBusinessAudit,
};