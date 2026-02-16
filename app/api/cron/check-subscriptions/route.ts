import { NextResponse } from "next/server";
import { createElement } from "react";
import prisma from "@/libs/prismadb";
import { createNotification } from "@/libs/notifications";
import { sendEmail } from "@/lib/email";
import { EmailTemplate } from "@/components/emails/EmailTemplate";
import { PLAN_INFO } from "@/lib/plan-features";

/**
 * Cron job to check for expired subscriptions and downgrade users.
 *
 * Finds all subscriptions where status=ACTIVE and endDate <= now,
 * sets their status to EXPIRED, and downgrades users to FREE
 * (unless they have another ACTIVE subscription).
 *
 * URL: /api/cron/check-subscriptions
 * Authorization: Bearer token (set in env CRON_SECRET)
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get("authorization");
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        console.log("[Cron] Starting subscription expiration check...");

        const now = new Date();
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr";

        // --- STEP 1: Send alerts for subscriptions expiring soon ---
        let alertsJ7Count = 0;
        let alertsJ1Count = 0;

        // Find subscriptions expiring in ~7 days (between 6.5 and 7.5 days from now)
        const expiringIn7Days = await prisma.subscription.findMany({
            where: {
                status: { in: ["ACTIVE", "GIFTED"] },
                endDate: {
                    gte: new Date(
                        now.getTime() + 6.5 * 24 * 60 * 60 * 1000
                    ),
                    lte: new Date(
                        now.getTime() + 7.5 * 24 * 60 * 60 * 1000
                    ),
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        firstName: true,
                    },
                },
            },
        });

        // Find subscriptions expiring in ~1 day (between 0.5 and 1.5 days from now)
        const expiringIn1Day = await prisma.subscription.findMany({
            where: {
                status: { in: ["ACTIVE", "GIFTED"] },
                endDate: {
                    gte: new Date(
                        now.getTime() + 0.5 * 24 * 60 * 60 * 1000
                    ),
                    lte: new Date(
                        now.getTime() + 1.5 * 24 * 60 * 60 * 1000
                    ),
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        firstName: true,
                    },
                },
            },
        });

        // Send J-7 alerts
        for (const sub of expiringIn7Days) {
            const planInfo = PLAN_INFO[sub.plan] || PLAN_INFO.FREE;
            const userName =
                sub.user.firstName || sub.user.name || "Cher utilisateur";

            try {
                await createNotification({
                    userId: sub.user.id,
                    type: "SUBSCRIPTION_EXPIRING",
                    title: "Votre abonnement expire bientôt",
                    message: `Votre abonnement ${planInfo.displayName} expire dans 7 jours. Renouvelez pour ne pas perdre vos fonctionnalités.`,
                    link: "/account/subscription",
                });

                if (sub.user.email) {
                    await sendEmail(
                        sub.user.email,
                        "Votre abonnement expire dans 7 jours",
                        createElement(
                            EmailTemplate,
                            {
                                heading: `${userName}, votre abonnement expire bientôt`,
                                actionLabel: "Renouveler mon abonnement",
                                actionUrl: `${appUrl}/account/subscription`,
                                children: null,
                            },
                            createElement(
                                "p",
                                { style: { margin: "0 0 16px" } },
                                `Votre abonnement ${planInfo.displayName} expire dans 7 jours.`
                            ),
                            createElement(
                                "p",
                                { style: { margin: "0 0 16px" } },
                                "Renouvelez maintenant pour continuer à profiter de toutes vos fonctionnalités :"
                            ),
                            createElement(
                                "ul",
                                {
                                    style: {
                                        margin: "0 0 16px",
                                        paddingLeft: "20px",
                                    },
                                },
                                ...planInfo.highlightFeatures.map((f, i) =>
                                    createElement(
                                        "li",
                                        {
                                            key: i,
                                            style: { margin: "4px 0" },
                                        },
                                        f
                                    )
                                )
                            )
                        )
                    );
                }

                alertsJ7Count++;
            } catch (alertError) {
                console.error(
                    `[Cron] Failed to send J-7 alert for subscription ${sub.id}:`,
                    alertError
                );
            }
        }

        // Send J-1 alerts
        for (const sub of expiringIn1Day) {
            const planInfo = PLAN_INFO[sub.plan] || PLAN_INFO.FREE;
            const userName =
                sub.user.firstName || sub.user.name || "Cher utilisateur";

            try {
                await createNotification({
                    userId: sub.user.id,
                    type: "SUBSCRIPTION_EXPIRING",
                    title: "Votre abonnement expire bientôt",
                    message: `Votre abonnement ${planInfo.displayName} expire demain ! Renouvelez maintenant.`,
                    link: "/account/subscription",
                });

                if (sub.user.email) {
                    await sendEmail(
                        sub.user.email,
                        "Votre abonnement expire demain !",
                        createElement(
                            EmailTemplate,
                            {
                                heading: `${userName}, votre abonnement expire demain !`,
                                actionLabel: "Renouveler maintenant",
                                actionUrl: `${appUrl}/account/subscription`,
                                children: null,
                            },
                            createElement(
                                "p",
                                { style: { margin: "0 0 16px" } },
                                `Votre abonnement ${planInfo.displayName} expire demain.`
                            ),
                            createElement(
                                "p",
                                {
                                    style: {
                                        margin: "0 0 16px",
                                        fontWeight: "600",
                                    },
                                },
                                "Ne perdez pas l'accès à vos fonctionnalités :"
                            ),
                            createElement(
                                "ul",
                                {
                                    style: {
                                        margin: "0 0 16px",
                                        paddingLeft: "20px",
                                    },
                                },
                                ...planInfo.highlightFeatures.map((f, i) =>
                                    createElement(
                                        "li",
                                        {
                                            key: i,
                                            style: { margin: "4px 0" },
                                        },
                                        f
                                    )
                                )
                            )
                        )
                    );
                }

                alertsJ1Count++;
            } catch (alertError) {
                console.error(
                    `[Cron] Failed to send J-1 alert for subscription ${sub.id}:`,
                    alertError
                );
            }
        }

        console.log(
            `[Cron] Expiration alerts sent. J-7: ${alertsJ7Count}, J-1: ${alertsJ1Count}`
        );

        // --- STEP 2: Expire subscriptions that have passed their end date ---

        // Find all subscriptions that should be expired
        const expiredSubscriptions = await prisma.subscription.findMany({
            where: {
                status: { in: ["ACTIVE", "GIFTED"] },
                endDate: {
                    not: null,
                    lte: now,
                },
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (expiredSubscriptions.length === 0) {
            console.log("[Cron] No expired subscriptions found.");
            return NextResponse.json({
                success: true,
                message: "No expired subscriptions found",
                expiredCount: 0,
                downgradedCount: 0,
                alertsJ7Count,
                alertsJ1Count,
            });
        }

        console.log(
            `[Cron] Found ${expiredSubscriptions.length} expired subscriptions`
        );

        // Mark all expired subscriptions as EXPIRED
        const expiredIds = expiredSubscriptions.map((s) => s.id);
        await prisma.subscription.updateMany({
            where: {
                id: { in: expiredIds },
            },
            data: {
                status: "EXPIRED",
            },
        });

        // Get unique user IDs from expired subscriptions
        const affectedUserIds = [
            ...new Set(expiredSubscriptions.map((s) => s.userId)),
        ];

        // For each affected user, check if they still have another ACTIVE subscription
        let downgradedCount = 0;
        for (const userId of affectedUserIds) {
            const remainingActive = await prisma.subscription.count({
                where: {
                    userId,
                    status: { in: ["ACTIVE", "GIFTED"] },
                },
            });

            if (remainingActive === 0) {
                // No remaining active subscriptions, downgrade to FREE
                await prisma.user.update({
                    where: { id: userId },
                    data: { plan: "FREE" },
                });
                downgradedCount++;
                console.log(
                    `[Cron] Downgraded user ${userId} to FREE plan`
                );
            }
        }

        console.log(
            `[Cron] Subscription check completed. Expired: ${expiredSubscriptions.length}, Downgraded: ${downgradedCount}`
        );

        return NextResponse.json({
            success: true,
            message: `Expired ${expiredSubscriptions.length} subscriptions, downgraded ${downgradedCount} users, alerts J-7: ${alertsJ7Count}, J-1: ${alertsJ1Count}`,
            expiredCount: expiredSubscriptions.length,
            downgradedCount,
            alertsJ7Count,
            alertsJ1Count,
        });
    } catch (error) {
        console.error(
            "[Cron] Fatal error in subscription expiration check:",
            error
        );
        return NextResponse.json(
            {
                error: "Internal server error",
                message:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
