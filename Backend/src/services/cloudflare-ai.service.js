const DEFAULT_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

class CloudflareAiError extends Error {
    constructor(message, status = 0, code = null) {
        super(message);
        this.name = "CloudflareAiError";
        this.status = status;
        this.code = code;
    }
}

const generateMarketingImage = async ({ prompt }) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const model = process.env.CLOUDFLARE_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

    if (!accountId || !apiToken) {
        throw new CloudflareAiError("Cloudflare Workers AI credentials are missing.");
    }
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2048) {
        throw new CloudflareAiError("The image prompt must contain between 1 and 2,048 characters.", 400);
    }

    const modelPath = model.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    const endpoint =
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`;

    let response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                prompt: prompt.trim(),
                steps: 4,
            }),
            signal: AbortSignal.timeout(120000),
        });
    } catch (error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
            throw new CloudflareAiError("Cloudflare image generation timed out. Please try again.", 504);
        }
        throw new CloudflareAiError("Could not reach Cloudflare Workers AI. Check the backend connection.", 502);
    }

    const payload = await response.json().catch(() => null);
    const providerError = payload?.errors?.[0];
    if (!response.ok || payload?.success === false) {
        throw new CloudflareAiError(
            providerError?.message || `Cloudflare image generation failed (HTTP ${response.status}).`,
            response.status,
            providerError?.code || null
        );
    }

    let imageBase64 = payload?.result?.image;
    if (typeof imageBase64 !== "string" || !imageBase64) {
        throw new CloudflareAiError("Cloudflare did not return a generated image.", 502);
    }

    imageBase64 = imageBase64.replace(/^data:image\/jpeg;base64,/i, "");
    const buffer = Buffer.from(imageBase64, "base64");
    if (!buffer.length) {
        throw new CloudflareAiError("Cloudflare returned an empty image.", 502);
    }

    return {
        buffer,
        mimeType: "image/jpeg",
        model,
    };
};

export { generateMarketingImage };
