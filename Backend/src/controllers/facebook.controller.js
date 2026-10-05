





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
        const { code, error, error_description } = req.query;

        if (error) {
            return res.status(400).json({
                success: false,
                message: error_description || "Facebook authorization failed",
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Facebook authorization code is missing",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Facebook callback reached",
            codeReceived: true,
        });
    } catch (error) {
        console.error("Facebook callback error:", error);

        return res.status(500).json({
            success: false,
            message: "Facebook callback failed",
        });
    }
};






export {
    connectFacebook,
    facebookCallback,
};