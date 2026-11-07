import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});


const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
];

const wait = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

const generateMarketingContent = async (prompt) => {
    for (let attempt = 0; attempt < models.length; attempt++) {
        const model = models[attempt];

        try {
            console.log(`Generating content using ${model}`);

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                },
            });

            return JSON.parse(response.text);
        } catch (error) {
            const status = Number(
                error.status ??
                error.response?.status ??
                error.error?.code ??
                error.response?.data?.error?.code
            );

            const errorText = [
                error.message || "",
                error.status || "",
                error.error?.status || "",
            ].join(" ").toUpperCase();

            const isTemporaryError =
                [429, 500, 502, 503, 504].includes(status) ||
                /UNAVAILABLE|RESOURCE_EXHAUSTED|HIGH DEMAND|OVERLOADED/.test(
                    errorText
                );

            const isLastAttempt = attempt === models.length - 1;

            if (!isTemporaryError || isLastAttempt) {
                throw error;
            }

            const delay = 1000 * (2 ** attempt);

            console.warn(
                `${model} failed temporarily. Trying the next model ` +
                `${models[attempt + 1]} in ${delay / 1000}s.`
            );

            await wait(delay);
        }
    }
};





export {
    generateMarketingContent,
};



