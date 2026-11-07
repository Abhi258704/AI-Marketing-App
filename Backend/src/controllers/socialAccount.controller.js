import SocialAccount from "../models/socialAccount.model.js";
import Business from "../models/business.model.js";
import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";

async function keepOnlyInstagramAccount(businessId, socialAccountId) {
    await SocialAccount.updateMany(
        {
            businessId,
            platform: "instagram",
            _id: { $ne: socialAccountId },
        },
        { $set: { status: "disconnected" } }
    );
}

// Create Social Account
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
                message:
                    "businessId, platform and platformAccountId are required",
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

        let socialAccount = await SocialAccount.findOne({
            businessId,
            platform,
            platformAccountId,
        });

        if (socialAccount) {
            socialAccount.accountName = accountName || socialAccount.accountName;
            socialAccount.accessToken = accessToken || socialAccount.accessToken;
            socialAccount.refreshToken = refreshToken || socialAccount.refreshToken;
            socialAccount.tokenExpiresAt = tokenExpiresAt || socialAccount.tokenExpiresAt;
            socialAccount.status = "connected";
            socialAccount.connectedAt = new Date();
            await socialAccount.save();
        } else {
            socialAccount = await SocialAccount.create({
                businessId,
                platform,
                platformAccountId,
                accountName,
                accessToken,
                refreshToken,
                tokenExpiresAt,
                connectedAt: new Date(),
            });
        }

        if (platform === "instagram") {
            await keepOnlyInstagramAccount(businessId, socialAccount._id);
        }

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

// Get Business Social Accounts

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

const keepInstagramAccount = async (req, res) => {
    try {
        const { socialAccountId } = req.params;
        if (!socialAccountId || !mongoose.isValidObjectId(socialAccountId)) {
            return res.status(400).json({
                success: false,
                message: "A valid Instagram social account ID is required",
            });
        }

        const socialAccount = await SocialAccount.findOne({
            _id: socialAccountId,
            platform: "instagram",
        });

        if (!socialAccount) {
            return res.status(404).json({
                success: false,
                message: "Instagram account not found",
            });
        }

        const business = await Business.findOne({
            _id: socialAccount.businessId,
            ownerId: req.user._id,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
            });
        }

        await keepOnlyInstagramAccount(business._id, socialAccount._id);
        socialAccount.status = "connected";
        await socialAccount.save();

        return res.status(200).json({
            success: true,
            message: "This Instagram account is now the only active account for this business",
            socialAccount: {
                _id: socialAccount._id,
                businessId: socialAccount.businessId,
                platform: socialAccount.platform,
                platformAccountId: socialAccount.platformAccountId,
                accountName: socialAccount.accountName,
                status: socialAccount.status,
                connectedAt: socialAccount.connectedAt,
                tokenExpiresAt: socialAccount.tokenExpiresAt,
            },
        });
    } catch (error) {
        console.error("Keep Instagram account error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Could not update the active Instagram account",
        });
    }
};

// Instagram OAuth Callback
const instagramCallback = async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Instagram returned an OAuth error
        if (error) {
            return res.status(400).json({
                success: false,
                message: error_description || error,
            });
        }

        // Authorization code is required
        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Authorization code is missing",
            });
        }

        console.log("Instagram authorization code received");

        // State is required
        if (!state) {
            return res.status(400).json({
                success: false,
                message: "OAuth state is missing",
            });
        }

        // Verify OAuth state
        let stateData;

        try {
            stateData = jwt.verify(state, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OAuth state",
            });
        }

        const { businessId, userId } = stateData;

        if (!businessId || !userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid OAuth state data",
            });
        }

        // Verify business belongs to the user
        const business = await Business.findOne({
            _id: businessId,
            ownerId: userId,
            isActive: true,
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found or access denied",
            });
        }

        console.log("OAuth state verified");
        console.log("Business ID:", businessId);
        console.log("User ID:", userId);

        // Exchange authorization code for short-lived token
        const tokenResponse = await axios.post(
            "https://api.instagram.com/oauth/access_token",
            new URLSearchParams({
                client_id: process.env.INSTAGRAM_APP_ID,
                client_secret: process.env.INSTAGRAM_APP_SECRET,
                grant_type: "authorization_code",
                redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
                code,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, user_id } = tokenResponse.data;

        console.log("Instagram short-lived access token received");
        console.log("Instagram user ID:", user_id);

        // Exchange short-lived token for long-lived token
        const longLivedTokenResponse = await axios.get(
            "https://graph.instagram.com/access_token",
            {
                params: {
                    grant_type: "ig_exchange_token",
                    client_secret: process.env.INSTAGRAM_APP_SECRET,
                    access_token,
                },
            }
        );

        const {
            access_token: longLivedAccessToken,
            expires_in,
        } = longLivedTokenResponse.data;

        console.log("Instagram long-lived access token received");
        console.log("Expires in:", expires_in, "seconds");

        // Fetch Instagram profile
        const profileResponse = await axios.get(
            "https://graph.instagram.com/me",
            {
                params: {
                    fields: "user_id,username",
                    access_token: longLivedAccessToken,
                },
            }
        );

        const instagramUsername = profileResponse.data.username;

        console.log("Instagram username:", instagramUsername);

        // Calculate token expiry
        const tokenExpiresAt = new Date(
            Date.now() + expires_in * 1000
        );

        // Check if this Instagram account is already connected
        const existingAccount = await SocialAccount.findOne({
            businessId,
            platform: "instagram",
            platformAccountId: user_id,
        });

        let socialAccount;

        // Update existing account
        if (existingAccount) {
            existingAccount.accessToken = longLivedAccessToken;
            existingAccount.tokenExpiresAt = tokenExpiresAt;
            existingAccount.accountName = instagramUsername;
            existingAccount.status = "connected";
            existingAccount.connectedAt = new Date();

            socialAccount = await existingAccount.save();
        }

        // Create new account when this Instagram ID has not been linked before.
        else {
            socialAccount = await SocialAccount.create({
                businessId,
                platform: "instagram",
                platformAccountId: user_id,
                accountName: instagramUsername,
                accessToken: longLivedAccessToken,
                tokenExpiresAt,
                status: "connected",
                connectedAt: new Date(),
            });
        }

        // A business may publish to only one Instagram account. Reauthorization replaces
        // the previous active account instead of leaving multiple accounts publishable.
        await keepOnlyInstagramAccount(businessId, socialAccount._id);

        return res.status(200).json({
            success: true,
            message: "Instagram account connected successfully",
            socialAccountId: socialAccount._id,
            platform: socialAccount.platform,
            platformAccountId: socialAccount.platformAccountId,
            accountName: socialAccount.accountName,
            status: socialAccount.status,
            tokenExpiresAt: socialAccount.tokenExpiresAt,
        });
    } catch (error) {
        console.error(
            "Instagram token exchange error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to exchange Instagram authorization code",
        });
    }
};

// Start Instagram OAuth
const connectInstagram = async (req, res) => {
    try {
        const { businessId } = req.query;

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

        const nonce = crypto.randomUUID();

        const state = jwt.sign(
            {
                businessId: business._id.toString(),
                userId: req.user._id.toString(),
                nonce,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m",
            }
        );

        const params = new URLSearchParams({
            client_id: process.env.INSTAGRAM_APP_ID,
            redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
            response_type: "code",
            scope:
                "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
            state,
            force_reauth: "true",
        });

        const instagramAuthUrl =
            `https://www.instagram.com/oauth/authorize?${params.toString()}`;

        return res.status(200).json({
            success: true,
            authUrl: instagramAuthUrl,
        });
    } catch (error) {
        console.error("Instagram connect error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create Instagram authorization URL",
        });
    }
};



export {
    createSocialAccount,
    getBusinessSocialAccounts,
    keepInstagramAccount,
    instagramCallback,
    connectInstagram,
};