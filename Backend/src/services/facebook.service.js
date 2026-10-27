import axios from "axios";



const exchangeFacebookCode = async (code) => {
    const response = await axios.get(
        "https://graph.facebook.com/v26.0/oauth/access_token",
        {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code,
            },
        }
    );

    return response.data;
};

const getFacebookPages = async (accessToken) => {
    const response = await axios.get(
        "https://graph.facebook.com/v26.0/me/accounts",
        {
            params: {
                fields: "id,name,access_token,instagram_business_account",
                access_token: accessToken,
            },
        }
    );

    return response.data;
};

const createFacebookPost = async ({
    pageId,
    pageAccessToken,
    message,
}) => {
    const response = await axios.post(
        `https://graph.facebook.com/v26.0/${pageId}/feed`,
        {
            message,
            access_token: pageAccessToken,
        }
    );

    return response.data;
};





export {
    exchangeFacebookCode,
    getFacebookPages,
    createFacebookPost,
};