import mongoose from "mongoose";
import Business from "../models/business.model.js";
import Review from "../models/review.model.js";
import { createNotification } from "../services/notification.service.js";

const createReview = async (req, res) => {
  try {
    const {
      businessId,
      customerName,
      customerEmail,
      rating,
      comment,
      publicDisplayConsent = false,
    } = req.body || {};

    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        message: "A valid businessId is required",
      });
    }

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      customerName.trim().length > 80
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required and must be 80 characters or fewer",
      });
    }

    if (
      customerEmail !== undefined &&
      customerEmail !== null &&
      (typeof customerEmail !== "string" || customerEmail.trim().length > 254)
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer email must be 254 characters or fewer",
      });
    }

    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number from 1 to 5",
      });
    }

    if (
      typeof comment !== "string" ||
      !comment.trim() ||
      comment.trim().length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Review message is required and must be 2000 characters or fewer",
      });
    }

    const business = await Business.findOne({
      _id: businessId,
      isActive: true,
    }).select("_id ownerId name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (typeof publicDisplayConsent !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "publicDisplayConsent must be a boolean",
      });
    }

    const review = await Review.create({
      businessId: business._id,
      customerName: customerName.trim(),
      customerEmail: customerEmail?.trim() || null,
      rating: numericRating,
      comment: comment.trim(),
      publicDisplayConsent,
      status: "pending",
    });

    if (business.ownerId) {
      await createNotification({
        userId: business.ownerId,
        businessId: business._id,
        type: "review_received",
        title: "New customer feedback",
        message: `${customerName.trim()} submitted a ${numericRating}/5 rating.`,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully and is awaiting moderation",
      review: {
        id: review._id,
        status: review.status,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    });
  }
};

const getApprovedTestimonials = async (req, res) => {
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
      isActive: true,
    }).select("_id name");

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 12)
    );
    const filter = {
      businessId: business._id,
      status: "approved",
      publicDisplayConsent: true,
    };

    const [reviews, total, ratingSummary] = await Promise.all([
      Review.find(filter)
        .select("customerName rating comment publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      business,
      testimonials: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      averageRating: ratingSummary.length
        ? Number(ratingSummary[0].averageRating.toFixed(1))
        : null,
    });
  } catch (error) {
    console.error("Get approved testimonials error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
    });
  }
};

const getPendingReviewCount = async (req, res) => {
  try {
    const filter = { status: "pending" };

    if (req.user.role !== "admin") {
      const ownedBusinessIds = await Business.find({
        ownerId: req.user._id,
      }).distinct("_id");
      filter.businessId = { $in: ownedBusinessIds };
    }

    const pendingCount = await Review.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pendingCount,
    });
  } catch (error) {
    console.error("Get pending review count error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending review count",
    });
  }
};

const getAdminReviews = async (req, res) => {
  try {
    const { businessId } = req.query;
    const status = req.query.status || "pending";
    const allowedStatuses = ["pending", "approved", "rejected", "all"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status filter",
      });
    }

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    // Platform admins can review all businesses. Other signed-in users
    // are restricted to businesses they own.
    if (req.user.role === "admin") {
      if (businessId) {
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid businessId",
          });
        }
        filter.businessId = businessId;
      }
    } else {
      const ownedBusinesses = await Business.find({
        ownerId: req.user._id,
      }).select("_id").lean();
      const ownedBusinessIds = ownedBusinesses.map((business) => business._id);

      if (businessId) {
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid businessId",
          });
        }

        const ownsRequestedBusiness = ownedBusinessIds.some(
          (ownedId) => ownedId.toString() === businessId
        );

        if (!ownsRequestedBusiness) {
          return res.status(403).json({
            success: false,
            message: "You can only manage feedback for businesses you own",
          });
        }

        filter.businessId = businessId;
      } else {
        filter.businessId = { $in: ownedBusinessIds };
      }
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 25)
    );

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("businessId", "name")
        .populate("moderatedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get manageable reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, rejectionReason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reviewId",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either approved or rejected",
      });
    }

    if (
      rejectionReason !== undefined &&
      (typeof rejectionReason !== "string" || rejectionReason.trim().length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must be 500 characters or fewer",
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (req.user.role !== "admin") {
      const ownsBusiness = await Business.exists({
        _id: review.businessId,
        ownerId: req.user._id,
      });

      if (!ownsBusiness) {
        return res.status(403).json({
          success: false,
          message: "You can only moderate feedback for businesses you own",
        });
      }
    }

    if (status === "approved" && !review.publicDisplayConsent) {
      return res.status(400).json({
        success: false,
        message: "Customer consent is required before publishing this feedback as a public testimonial",
      });
    }

    review.status = status;
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    review.publishedAt = status === "approved" ? new Date() : null;
    review.rejectionReason =
      status === "rejected" ? rejectionReason?.trim() || null : null;

    await review.save();

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Feedback approved and published as a testimonial"
          : "Feedback rejected",
      review: {
        id: review._id,
        businessId: review.businessId,
        status: review.status,
        moderatedAt: review.moderatedAt,
        publishedAt: review.publishedAt,
      },
    });
  } catch (error) {
    console.error("Moderate review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to moderate review",
    });
  }
};

export {
  createReview,
  getApprovedTestimonials,
  getPendingReviewCount,
  getAdminReviews,
  moderateReview,
};
