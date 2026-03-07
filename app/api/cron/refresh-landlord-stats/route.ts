import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { LandlordProfileService } from "@/services/LandlordProfileService";

/**
 * Cron job to refresh response time / response rate stats for active landlords.
 * Runs daily at 4:00 AM UTC.
 *
 * URL: /api/cron/refresh-landlord-stats
 * Authorization: Bearer token (set in env CRON_SECRET)
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log('[Cron] Starting landlord stats refresh...');

        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        // Find all landlords who have sent at least one message in the last 90 days
        const activeLandlords = await prisma.user.findMany({
            where: {
                messages: {
                    some: {
                        createdAt: { gte: ninetyDaysAgo },
                    },
                },
                properties: {
                    some: {},
                },
            },
            select: { id: true },
        });

        console.log(`[Cron] Found ${activeLandlords.length} active landlords to refresh`);

        if (activeLandlords.length === 0) {
            return NextResponse.json({
                message: "No active landlords to refresh",
                updated: 0,
                errors: 0,
            });
        }

        let updated = 0;
        let errors = 0;

        for (const landlord of activeLandlords) {
            try {
                await LandlordProfileService.refreshStats(landlord.id);
                updated++;
            } catch (error) {
                errors++;
                console.error(
                    `[Cron] Failed to refresh stats for landlord ${landlord.id}:`,
                    error instanceof Error ? error.message : error
                );
            }
        }

        console.log(
            `[Cron] Landlord stats refresh completed. Updated: ${updated}, Errors: ${errors}`
        );

        return NextResponse.json({
            success: true,
            updated,
            errors,
        });
    } catch (error) {
        console.error('[Cron] Fatal error in landlord stats refresh:', error);
        return NextResponse.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
