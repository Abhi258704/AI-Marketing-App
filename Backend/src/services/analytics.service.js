
import axios from "axios";
import Analytics from "../models/analytics.model.js";




const syncInstagramAnalytics = async ({ businessId, socialAccount }) => {
    if (
        !businessId ||
        !socialAccount?.platformAccountId ||
        !socialAccount?.accessToken
    ) {
        throw new Error("Instagram account details are incomplete");
    }

    // Use the last 7 complete UTC days, excluding the most
    // recent 2 days because Instagram insights can be delayed.
    const periodEnd = new Date();
    periodEnd.setUTCDate(periodEnd.getUTCDate() - 2);
    periodEnd.setUTCHours(23, 59, 59, 0);

    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 6);
    periodStart.setUTCHours(0, 0, 0, 0);

    const response = await axios.get(
        `https://graph.instagram.com/v26.0/${socialAccount.platformAccountId}/insights`,
        {
            params: {
                metric: "reach,views,accounts_engaged,total_interactions",
                period: "day",
                metric_type: "total_value",
                since: Math.floor(periodStart.getTime() / 1000),
                until: Math.floor(periodEnd.getTime() / 1000),
                access_token: socialAccount.accessToken,
            },
        }
    );

    let recordsSaved = 0;

    for (const metricData of response.data.data || []) {
        const rawValue = metricData.total_value?.value;

        // Missing metrics are unavailable, not zero.
        if (rawValue === undefined || rawValue === null) {
            continue;
        }

        const value = Number(rawValue);

        if (!Number.isFinite(value)) {
            continue;
        }

        await Analytics.findOneAndUpdate(
            {
                businessId,
                source: "instagram",
                metric: metricData.name,
                periodStart,
                periodEnd,
            },
            {
                $set: { value },
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
            }
        );

        recordsSaved++;
    }

    return {
        success: true,
        recordsSaved,
        periodStart,
        periodEnd,
    };
};


const syncFacebookAnalytics = async ({ businessId, socialAccount }) => {
    if (
        !businessId ||
        !socialAccount?.platformAccountId ||
        !socialAccount?.accessToken
    ) {
        throw new Error("Facebook Page details are incomplete");
    }

    // Use the last 7 complete UTC days, excluding the
    // most recent 2 days because insights can be delayed.
    const periodEnd = new Date();
    periodEnd.setUTCDate(periodEnd.getUTCDate() - 2);
    periodEnd.setUTCHours(23, 59, 59, 0);

    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 6);
    periodStart.setUTCHours(0, 0, 0, 0);

    const response = await axios.get(
        `https://graph.facebook.com/v26.0/${socialAccount.platformAccountId}/insights`,
        {
            params: {
                metric:
                    "page_media_view,page_post_engagements,page_views_total,page_follows",
                period: "day",
                since: Math.floor(periodStart.getTime() / 1000),
                until: Math.floor(periodEnd.getTime() / 1000),
                access_token: socialAccount.accessToken,
            },
        }
    );

    let recordsSaved = 0;

    for (const metricData of response.data.data || []) {
        for (const point of metricData.values || []) {
            if (point.value === undefined || point.value === null) {
                continue;
            }

            const value = Number(point.value);
            const metricPeriodEnd = new Date(point.end_time);

            if (
                !Number.isFinite(value) ||
                Number.isNaN(metricPeriodEnd.getTime())
            ) {
                continue;
            }

            const metricPeriodStart = new Date(metricPeriodEnd);
            metricPeriodStart.setUTCDate(
                metricPeriodStart.getUTCDate() - 1
            );

            await Analytics.findOneAndUpdate(
                {
                    businessId,
                    source: "facebook",
                    metric: metricData.name,
                    periodStart: metricPeriodStart,
                    periodEnd: metricPeriodEnd,
                },
                {
                    $set: { value },
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    runValidators: true,
                }
            );

            recordsSaved++;
        }
    }

    return {
        success: true,
        recordsSaved,
        periodStart,
        periodEnd,
    };
};






export {
    syncInstagramAnalytics,
    syncFacebookAnalytics,
};