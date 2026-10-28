import { generateMarketingContent } from "./ai.service.js";
import BusinessAudit from "../models/businessAudit.model.js";
import Recommendation from "../models/recommendation.model.js";




const runBusinessAudit = async (business) => {
    const businessData = {
        name: business.name,
        category: business.category,
        description: business.description,
        address: business.address,
        phone: business.phone,
        website: business.website,
        hasLogo: Boolean(business.logoUrl),
    };

    const prompt = `
You are an AI assistant auditing a local business profile.

Analyze the following business information:
${JSON.stringify(businessData, null, 2)}

Return ONLY valid JSON with this structure:
{
    "profileScore": 0,
    "issues": [
        {
            "category": "profile",
            "title": "Short issue title",
            "description": "Explain the issue",
            "priority": "low"
        }
    ],
    "recommendations": [
        {
            "title": "Short recommendation title",
            "description": "Specific action the business should take",
            "priority": "medium"
        }
    ]
}

Rules:
- profileScore must be an integer from 0 to 100.
- Evaluate only the completeness and quality of the supplied profile data.
- Identify missing or weak profile information.
- Provide practical, specific recommendations.
- Use only these priority values: low, medium, high.
- Issue category must be profile or general.
- Do not invent business facts, customer reviews, keyword rankings,
  website SEO results, or social media performance.
- Do not assume that missing information is necessarily incorrect.
- Return valid JSON without Markdown or code fences.
`;

    const result = await generateMarketingContent(prompt);

    if (
        !result ||
        !Number.isFinite(Number(result.profileScore)) ||
        Number(result.profileScore) < 0 ||
        Number(result.profileScore) > 100
    ) {
        throw new Error("AI returned an invalid business audit score");
    }

    const validPriorities = ["low", "medium", "high"];
    const validCategories = ["profile", "general"];

    const issues = (Array.isArray(result.issues) ? result.issues : [])
        .filter(
            (issue) =>
                issue &&
                typeof issue.title === "string" &&
                issue.title.trim() &&
                typeof issue.description === "string" &&
                issue.description.trim()
        )
        .map((issue) => ({
            category: validCategories.includes(issue.category)
                ? issue.category
                : "profile",
            title: issue.title.trim(),
            description: issue.description.trim(),
            priority: validPriorities.includes(issue.priority)
                ? issue.priority
                : "medium",
        }));

    const recommendations = (
        Array.isArray(result.recommendations) ? result.recommendations : []
    )
        .filter(
            (item) =>
                item &&
                typeof item.title === "string" &&
                item.title.trim() &&
                typeof item.description === "string" &&
                item.description.trim()
        )
        .map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            priority: validPriorities.includes(item.priority)
                ? item.priority
                : "medium",
        }));

    const profileScore = Math.round(Number(result.profileScore));

    const audit = await BusinessAudit.create({
        businessId: business._id,
        overallScore: profileScore,
        profileScore,
        reviewScore: null,
        contentScore: null,
        seoScore: null,
        issues,
    });

    let savedRecommendations = [];

    if (recommendations.length > 0) {
        savedRecommendations = await Recommendation.insertMany(
            recommendations.map((item) => ({
                ...item,
                auditId: audit._id,
            }))
        );
    }

    return {
        audit,
        recommendations: savedRecommendations,
    };
};




export {
    runBusinessAudit,
};