import { NextResponse } from "next/server";
import {
    getConversionFunnel,
    getActivityFeed,
    getEngagementMetrics,
    getRentalMetrics,
    getGeoDistribution,
    getPlanDistribution,
    getCities,
    getSubscriptionMetrics,
    Period,
} from "@/app/actions/getAdminAdvancedStats";

const VALID_PERIODS = new Set(["7d", "30d", "90d", "all"]);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get("period") || "30d";

        if (!VALID_PERIODS.has(periodParam)) {
            return NextResponse.json(
                { error: "Invalid period. Use 7d, 30d, 90d, or all." },
                { status: 400 }
            );
        }

        const period = periodParam as Period;
        const city = searchParams.get("city") || undefined;

        const [
            conversionFunnel,
            activityFeed,
            engagementMetrics,
            rentalMetrics,
            geoDistribution,
            planDistribution,
            cities,
            subscriptionMetrics,
        ] = await Promise.all([
            getConversionFunnel(period, city),
            getActivityFeed(),
            getEngagementMetrics(),
            getRentalMetrics(city),
            getGeoDistribution(),
            getPlanDistribution(),
            getCities(),
            getSubscriptionMetrics(),
        ]);

        if (
            conversionFunnel === null &&
            activityFeed === null &&
            engagementMetrics === null
        ) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            conversionFunnel,
            activityFeed,
            engagementMetrics,
            rentalMetrics,
            geoDistribution,
            planDistribution,
            cities,
            subscriptionMetrics,
        });
    } catch (error) {
        console.error("Error in advanced-stats API route", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
