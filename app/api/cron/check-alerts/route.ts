import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { sendPushNotification } from "@/app/lib/sendPushNotification";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/libs/notifications";

/**
 * Cron job to check for new listings matching user alerts
 * Should be called every 15-30 minutes via Vercel Cron or external cron service
 *
 * URL: /api/cron/check-alerts
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

        console.log('[Cron] Starting alert check job...');

        // Get all active alerts
        const alerts = await (prisma as any).searchAlert.findMany({
            where: {
                isActive: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            }
        });

        console.log(`[Cron] Found ${alerts.length} active alerts`);

        if (alerts.length === 0) {
            return NextResponse.json({
                message: "No active alerts to check",
                processed: 0
            });
        }

        // Get timestamp of last check (use lastSentAt from alert or 30 minutes ago as fallback)
        const defaultTimeWindow = new Date(Date.now() - 30 * 60 * 1000);

        let totalNotificationsSent = 0;
        const results = [];

        // Process each alert
        for (const alert of alerts) {
            try {
                const sinceTime = alert.lastSentAt || defaultTimeWindow;

                // Build where clause based on alert criteria
                const where: any = {
                    createdAt: {
                        gt: sinceTime
                    },
                    status: 'PUBLISHED',
                    isPublished: true
                };

                if (alert.locationValue) {
                    where.rentalUnit = {
                        property: {
                            locationValue: alert.locationValue
                        }
                    };
                }

                if (alert.category) {
                    where.rentalUnit = {
                        ...where.rentalUnit,
                        property: {
                            ...where.rentalUnit?.property,
                            category: alert.category
                        }
                    };
                }

                if (alert.minPrice) {
                    where.price = {
                        ...where.price,
                        gte: alert.minPrice
                    };
                }

                if (alert.maxPrice) {
                    where.price = {
                        ...where.price,
                        lte: alert.maxPrice
                    };
                }

                if (alert.roomCount) {
                    where.roomCount = {
                        gte: alert.roomCount
                    };
                }

                // Find matching listings
                const matchingListings = await prisma.listing.findMany({
                    where,
                    include: {
                        rentalUnit: {
                            include: {
                                property: true,
                                images: {
                                    take: 1,
                                    orderBy: { order: 'asc' }
                                }
                            }
                        }
                    },
                    take: 10, // Limit to 10 new listings per alert
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                console.log(`[Cron] Alert ${alert.id}: Found ${matchingListings.length} new matches`);

                if (matchingListings.length > 0) {
                    // Send notifications based on frequency
                    const shouldSendNow = alert.frequency === 'INSTANT' ||
                        (alert.frequency === 'DAILY' && (!alert.lastSentAt ||
                         Date.now() - alert.lastSentAt.getTime() > 24 * 60 * 60 * 1000));

                    if (shouldSendNow) {
                        // Prepare notification content
                        const firstListing = matchingListings[0];
                        const listingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/listings/${firstListing.id}`;
                        const count = matchingListings.length;

                        // Send push notification
                        try {
                            await sendPushNotification({
                                userId: alert.userId,
                                title: count === 1
                                    ? '🏠 Nouvelle annonce correspondant à vos critères !'
                                    : `🏠 ${count} nouvelles annonces trouvées !`,
                                body: count === 1
                                    ? `${firstListing.title} - ${firstListing.price}€/mois`
                                    : `${count} nouveaux logements correspondent à votre recherche.`,
                                url: listingUrl,
                                type: 'application'
                            });
                            console.log(`[Cron] Push notification sent to user ${alert.userId}`);
                        } catch (error) {
                            console.error(`[Cron] Failed to send push for alert ${alert.id}:`, error);
                        }

                        // Create in-app notification
                        try {
                            await createNotification({
                                userId: alert.userId,
                                type: 'ALERT_MATCH',
                                title: count === 1 ? 'Nouvelle annonce' : `${count} nouvelles annonces`,
                                message: count === 1
                                    ? `${firstListing.title} - ${firstListing.price}€/mois`
                                    : `${count} nouveaux logements correspondent à votre recherche.`,
                                link: listingUrl
                            });
                        } catch (error) {
                            console.error(`[Cron] Failed to create in-app notification:`, error);
                        }

                        // Send email notification
                        try {
                            if (alert.user.email) {
                                const listingsHtml = matchingListings.slice(0, 5).map(listing => `
                                    <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                                        <h3 style="margin: 0 0 8px 0;">${listing.title}</h3>
                                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                            ${listing.price}€/mois ${(listing.charges as any)?.amount ? `+ ${(listing.charges as any).amount}€ de charges` : ''}
                                        </p>
                                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing.id}"
                                           style="display: inline-block; margin-top: 10px; padding: 8px 16px; background-color: #f43f5e; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
                                            Voir l'annonce
                                        </a>
                                    </div>
                                `).join('');

                                await sendEmail(
                                    alert.user.email,
                                    count === 1
                                        ? '🏠 Nouvelle annonce correspondant à vos critères'
                                        : `🏠 ${count} nouvelles annonces trouvées`,
                                    `
                                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                            <h2 style="color: #111827;">Bonjour ${alert.user.name || 'cher utilisateur'},</h2>
                                            <p style="color: #374151; font-size: 16px;">
                                                ${count === 1
                                                    ? 'Une nouvelle annonce correspond à vos critères de recherche :'
                                                    : `${count} nouvelles annonces correspondent à vos critères de recherche :`
                                                }
                                            </p>
                                            ${listingsHtml}
                                            ${count > 5 ? `<p style="color: #6b7280; font-size: 14px;">Et ${count - 5} autres annonces...</p>` : ''}
                                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                                            <p style="color: #6b7280; font-size: 12px;">
                                                Vous recevez cet email car vous avez créé une alerte sur Coridor.
                                                <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/alerts" style="color: #f43f5e;">Gérer mes alertes</a>
                                            </p>
                                        </div>
                                    `
                                );
                                console.log(`[Cron] Email sent to ${alert.user.email}`);
                            }
                        } catch (error) {
                            console.error(`[Cron] Failed to send email for alert ${alert.id}:`, error);
                        }

                        // Update alert lastSentAt
                        await (prisma as any).searchAlert.update({
                            where: { id: alert.id },
                            data: {
                                lastSentAt: new Date(),
                                matchCount: {
                                    increment: matchingListings.length
                                }
                            }
                        });

                        totalNotificationsSent++;
                        results.push({
                            alertId: alert.id,
                            userId: alert.userId,
                            matchesFound: matchingListings.length,
                            notificationSent: true
                        });
                    } else {
                        // Just update match count without sending notification
                        await (prisma as any).searchAlert.update({
                            where: { id: alert.id },
                            data: {
                                matchCount: {
                                    increment: matchingListings.length
                                }
                            }
                        });

                        results.push({
                            alertId: alert.id,
                            userId: alert.userId,
                            matchesFound: matchingListings.length,
                            notificationSent: false,
                            reason: 'Daily frequency not yet due'
                        });
                    }
                } else {
                    results.push({
                        alertId: alert.id,
                        userId: alert.userId,
                        matchesFound: 0,
                        notificationSent: false
                    });
                }
            } catch (error) {
                console.error(`[Cron] Error processing alert ${alert.id}:`, error);
                results.push({
                    alertId: alert.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        console.log(`[Cron] Alert check completed. Sent ${totalNotificationsSent} notifications.`);

        return NextResponse.json({
            success: true,
            message: `Processed ${alerts.length} alerts, sent ${totalNotificationsSent} notifications`,
            alertsProcessed: alerts.length,
            notificationsSent: totalNotificationsSent,
            results
        });

    } catch (error) {
        console.error('[Cron] Fatal error in alert check:', error);
        return NextResponse.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
