import {
    exchangeFacebookCode,
    getFacebookPages,
} from "../services/facebook.service.js";
import SocialAccount from "../models/socialAccount.model.js";





const connectFacebook = async (req, res) => {
    try {
        const { businessId } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: "businessId is required",
            });
        }

        const facebookAuthUrl =
            `https://www.facebook.com/dialog/oauth?` +
            new URLSearchParams({
                client_id: process.env.FACEBOOK_APP_ID,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                response_type: "code",
                scope: "pages_show_list,pages_manage_posts,pages_read_engagement",
                state: businessId,
            }).toString();

        return res.status(200).json({
            success: true,
            authUrl: facebookAuthUrl,
        });
    } catch (error) {
        console.error("Facebook connect error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to start Facebook connection",
        });
    }
};

const facebookCallback = async (req, res) => {
    try {
        const { code, error, error_description, state } = req.query;

        if (error) {
            return res.status(400).json({
                success: false,
                message: error_description || "Facebook authorization failed",
            });
        }

        if (!state) {
            return res.status(400).json({
                success: false,
                message: "businessId is missing from Facebook OAuth state",
            });
        }

        const businessId = state;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Facebook authorization code is missing",
            });
        }

        const tokenData = await exchangeFacebookCode(code);

        const pages = await getFacebookPages(tokenData.access_token);

        const page = pages.data?.[0];

        if (!page) {
            return res.status(400).json({
                success: false,
                message: "No Facebook Page found",
            });
        }

        const socialAccount = await SocialAccount.findOneAndUpdate(
            {
                businessId,
                platform: "facebook",
                platformAccountId: page.id,
            },
            {
                businessId,
                platform: "facebook",
                platformAccountId: page.id,
                accountName: page.name,
                accessToken: page.access_token,
                status: "connected",
                connectedAt: new Date(),
            },
            {
                new: true,
                upsert: true,
            }
        );

        return res.status(200).json({
            success: true,
            message: "Facebook Page connected successfully",
            businessId,
            socialAccount: {
                id: socialAccount._id,
                platform: socialAccount.platform,
                platformAccountId: socialAccount.platformAccountId,
                accountName: socialAccount.accountName,
                status: socialAccount.status,
                connectedAt: socialAccount.connectedAt,
            },
        });
    } catch (error) {
        console.error(
            "Facebook callback error:",
            error.response?.data || error.message || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to exchange Facebook authorization code",
        });
    }
};





export {
    connectFacebook,
    facebookCallback,
};