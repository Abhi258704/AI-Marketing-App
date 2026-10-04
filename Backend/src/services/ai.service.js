import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const generateMarketingContent = async (prompt) => {
    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        },
    });

    return JSON.parse(response.text);
};

export {
    generateMarketingContent,
};