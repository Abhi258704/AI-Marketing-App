
import Business from "../models/business.model.js";
import BusinessAudit from "../models/businessAudit.model.js";
import Recommendation from "../models/recommendation.model.js";



// Get recommendations for a specific audit
const getAuditRecommendations = async (req, res) => {
    try {
        const { auditId } = req.params;

        const audit = await BusinessAudit.findById(auditId);

        if (!audit) {
            return res.status(404).json({
                success: false,
                message: "Business audit not found",
            });
        }

        const business = await Business.findOne({
            _id: audit.businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business audit not found",
            });
        }

        const recommendations = await Recommendation.find({
            auditId: audit._id,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: recommendations.length,
            recommendations,
        });
    } catch (error) {
        console.error("Get recommendations error:", error.message || error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch recommendations",
        });
    }
};

// Update recommendation status
const updateRecommendationStatus = async (req, res) => {
    try {
        const { recommendationId } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "in_progress",
            "completed",
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be pending, in_progress or completed",
            });
        }

        const recommendation =
            await Recommendation.findById(recommendationId);

        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: "Recommendation not found",
            });
        }

        const audit = await BusinessAudit.findById(
            recommendation.auditId
        );

        if (!audit) {
            return res.status(404).json({
                success: false,
                message: "Recommendation not found",
            });
        }

        const business = await Business.findOne({
            _id: audit.businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Recommendation not found",
            });
        }

        recommendation.status = status;
        recommendation.completedAt =
            status === "completed" ? new Date() : null;

        await recommendation.save();

        return res.status(200).json({
            success: true,
            message: "Recommendation status updated successfully",
            recommendation,
        });
    } catch (error) {
        console.error(
            "Update recommendation status error:",
            error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update recommendation status",
        });
    }
};



export {
    getAuditRecommendations,
    updateRecommendationStatus,
};
