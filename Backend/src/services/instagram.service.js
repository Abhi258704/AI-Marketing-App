import axios from "axios";



const createInstagramMediaContainer = async ({
    instagramAccountId,
    accessToken,
    imageUrl,
    caption,
}) => {
    const response = await axios.post(
        `https://graph.instagram.com/v26.0/${instagramAccountId}/media`,
        {
            image_url: imageUrl,
            caption,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );

    return response.data;
};

const publishInstagramMediaContainer = async ({
    instagramAccountId,
    accessToken,
    containerId,
}) => {
    const response = await axios.post(
        `https://graph.instagram.com/v26.0/${instagramAccountId}/media_publish`,
        {
            creation_id: containerId,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );

    return response.data;
};


export {
    createInstagramMediaContainer,
    publishInstagramMediaContainer,
};