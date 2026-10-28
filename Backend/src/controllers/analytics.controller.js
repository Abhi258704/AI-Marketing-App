
import mongoose from "mongoose";
import Business from "../models/business.model.js";
import Analytics from "../models/analytics.model.js";
import SocialAccount from "../models/socialAccount.model.js";
import {
    syncInstagramAnalytics,
    syncFacebookAnalytics,
} from "../services/analytics.service.js";



// Get analytics for a business
const getBusinessAnalytics = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { source, from, to } = req.query;

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid businessId",
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

        const filters = { businessId: business._id };

        if (source) {
            filters.source = source;
        }

        if (from || to) {
            filters.periodStart = {};

            if (from) {
                const fromDate = new Date(from);

                if (Number.isNaN(fromDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid from date",
                    });
                }

                filters.periodStart.$gte = fromDate;
            }

            if (to) {
                const toDate = new Date(to);

                if (Number.isNaN(toDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid to date",
                    });
                }

                filters.periodStart.$lte = toDate;
            }
        }

        const analytics = await Analytics.find(filters)
            .sort({ periodStart: -1 })
            .limit(500);

        return res.status(200).json({
            success: true,
            businessId: business._id,
            count: analytics.length,
            analytics,
        });
    } catch (error) {
        console.error(
            "Get business analytics error:",
            error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch business analytics",
        });
    }
};

const syncInstagramAnalyticsForBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid businessId",
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

        const socialAccount = await SocialAccount.findOne({
            businessId: business._id,
            platform: "instagram",
            status: "connected",
        });

        if (!socialAccount) {
            return res.status(404).json({
                success: false,
                message: "No connected Instagram account found",
            });
        }

        const result = await syncInstagramAnalytics({
            businessId: business._id,
            socialAccount,
        });

        return res.status(200).json({
            success: true,
            message: "Instagram analytics synced successfully",
            ...result,
        });
    } catch (error) {
        console.error(
            "Instagram analytics sync error:",
            error.response?.data || error.message || error
        );

        return res.status(error.response ? 502 : 500).json({
            success: false,
            message: "Failed to sync Instagram analytics",
        });
    }
};

const syncFacebookAnalyticsForBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid businessId",
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

        const socialAccount = await SocialAccount.findOne({
            businessId: business._id,
            platform: "facebook",
            status: "connected",
        });

        if (!socialAccount) {
            return res.status(404).json({
                success: false,
                message: "No connected Facebook Page found",
            });
        }

        const result = await syncFacebookAnalytics({
            businessId: business._id,
            socialAccount,
        });

        return res.status(200).json({
            success: true,
            message: "Facebook analytics synced successfully",
            ...result,
        });
    } catch (error) {
        console.error(
            "Facebook analytics sync error:",
            error.response?.data || error.message || error
        );

        return res.status(error.response ? 502 : 500).json({
            success: false,
            message: "Failed to sync Facebook analytics",
        });
    }
};

const getBusinessAnalyticsSummary = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { from, to } = req.query;

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid businessId",
            });
        }

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: "Both from and to dates are required (YYYY-MM-DD)",
            });
        }

        const isDateOnly = (value) =>
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(
                new Date(`${value}T00:00:00.000Z`).getTime()
            );

        if (!isDateOnly(from) || !isDateOnly(to)) {
            return res.status(400).json({
                success: false,
                message: "Dates must use YYYY-MM-DD format",
            });
        }

        const fromDate = new Date(`${from}T00:00:00.000Z`);
        const toExclusive = new Date(`${to}T00:00:00.000Z`);

        toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

        if (fromDate >= toExclusive) {
            return res.status(400).json({
                success: false,
                message: "The from date must be on or before the to date",
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

        const summary = await Analytics.aggregate([
            {
                $match: {
                    businessId: business._id,
                    periodStart: {
                        $gte: fromDate,
                        $lt: toExclusive,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        source: "$source",
                        metric: "$metric",
                    },
                    value: { $sum: "$value" },
                    recordsCount: { $sum: 1 },
                    lastPeriodEnd: { $max: "$periodEnd" },
                },
            },
            {
                $sort: {
                    "_id.source": 1,
                    "_id.metric": 1,
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            businessId: business._id,
            from,
            to,
            count: summary.length,
            summary: summary.map((item) => ({
                source: item._id.source,
                metric: item._id.metric,
                value: item.value,
                recordsCount: item.recordsCount,
                lastPeriodEnd: item.lastPeriodEnd,
            })),
        });
    } catch (error) {
        console.error(
            "Get analytics summary error:",
            error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch analytics summary",
        });
    }
};




export {
    getBusinessAnalytics,
    syncInstagramAnalyticsForBusiness,
    syncFacebookAnalyticsForBusiness,
    getBusinessAnalyticsSummary,
};