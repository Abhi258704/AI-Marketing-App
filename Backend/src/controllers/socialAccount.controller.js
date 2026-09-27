import SocialAccount from "../models/socialAccount.model.js";
import Business from "../models/business.model.js";





const createSocialAccount = async (req, res) => {
    try {
        const {
            businessId,
            platform,
            platformAccountId,
            accountName,
            accessToken,
            refreshToken,
            tokenExpiresAt,
        } = req.body;

        if (!businessId || !platform || !platformAccountId) {
            return res.status(400).json({
                message: "businessId, platform and platformAccountId are required",
            });
        }

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
        });

        if (!business) {
            return res.status(404).json({
                message: "Business not found",
            });
        }

        const socialAccount = await SocialAccount.create({
            businessId,
            platform,
            platformAccountId,
            accountName,
            accessToken,
            refreshToken,
            tokenExpiresAt,
            connectedAt: new Date(),
        });

        const safeSocialAccount = socialAccount.toObject();

        delete safeSocialAccount.accessToken;
        delete safeSocialAccount.refreshToken;

        return res.status(201).json({
            message: "Social account created successfully",
            socialAccount: safeSocialAccount,
        });


    } catch (error) {
        console.error("Create social account error:", error);

        return res.status(500).json({
            message: "Failed to create social account",
        });
    }
};

const getBusinessSocialAccounts = async (req, res) => {
    try {
        const { businessId } = req.params;

        const business = await Business.findOne({
            _id: businessId,
            ownerId: req.user._id,
        });

        if (!business) {
            return res.status(404).json({
                message: "Business not found",
            });
        }

        const socialAccounts = await SocialAccount.find({
            businessId,
        }).select("-accessToken -refreshToken");

        return res.status(200).json({
            socialAccounts,
        });
    } catch (error) {
        console.error("Get social accounts error:", error);

        return res.status(500).json({
            message: "Failed to fetch social accounts",
        });
    }
};





export {
    createSocialAccount,
    getBusinessSocialAccounts,
};