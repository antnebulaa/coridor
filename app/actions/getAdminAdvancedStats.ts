"use server";

import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Period = "7d" | "30d" | "90d" | "all";

export interface FunnelStep {
    step: string;
    count: number;
    rate: number;
}

export interface ActivityEvent {
    type:
        | "user_signup"
        | "listing_published"
        | "application_sent"
        | "visit_confirmed"
        | "lease_signed"
        | "message_sent"
        | "report_created"
        | "bank_connected";
    date: string;
    data: { id: string; name?: string; title?: string; city?: string; count?: number };
}

export interface EngagementMetrics {
    dau: number;
    wau: number;
    mau: number;
    profileCompletion: number;
    onboardingRate: number;
    draftNeverPublished: number;
    sparklines: {
        dau: number[];
        wau: number[];
        mau: number[];
    };
}

export interface RentalMetrics {
    avgDaysToLease: number | null;
    avgApplicationsPerListing: number | null;
    visitAcceptanceRate: number | null;
    topCities: { city: string; count: number }[];
}

export interface GeoDistributionEntry {
    city: string;
    count: number;
}

export interface PlanDistributionData {
    plans: { plan: string; count: number }[];
    activeBankConnections: number;
    verifiedTenants: number;
    processedTransactions: number;
}

export interface SubscriptionMetricsData {
    activeSubscriptions: number;
    mrr: number;
    churnRate: number;
    activeGifts: number;
    upcomingExpirations: number;
    planBreakdown: {
        plan: string;
        active: number;
        expired: number;
        cancelled: number;
        gifted: number;
    }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodDate(period: Period): Date | null {
    if (period === "all") return null;
    const now = new Date();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    now.setDate(now.getDate() - days);
    return now;
}

async function assertAdmin(): Promise<boolean> {
    const currentUser = await getCurrentUser();
    return !!(currentUser && currentUser.role === "ADMIN");
}

// ─── 1. Conversion Funnel ───────────────────────────────────────────────────

export async function getConversionFunnel(
    period: Period = "30d",
    city?: string
): Promise<FunnelStep[] | null> {
    if (!(await assertAdmin())) return null;

    try {
        const since = getPeriodDate(period);
        const dateGte = since ? { gte: since } : undefined;

        const [signups, published, applications, confirmedVisits, signedLeases] =
            await Promise.all([
                prisma.user.count({
                    where: {
                        ...(since ? { createdAt: dateGte } : {}),
                        ...(city ? { city } : {}),
                    },
                }),
                prisma.listing.count({
                    where: {
                        status: "PUBLISHED",
                        ...(since ? { statusUpdatedAt: { gte: since } } : {}),
                        ...(city ? { rentalUnit: { property: { city } } } : {}),
                    },
                }),
                prisma.rentalApplication.count({
                    where: {
                        ...(since ? { appliedAt: dateGte } : {}),
                        ...(city ? { listing: { rentalUnit: { property: { city } } } } : {}),
                    },
                }),
                prisma.visit.count({
                    where: {
                        status: "CONFIRMED",
                        ...(since ? { createdAt: dateGte } : {}),
                        ...(city ? { listing: { rentalUnit: { property: { city } } } } : {}),
                    },
                }),
                prisma.rentalApplication.count({
                    where: {
                        leaseStatus: "SIGNED",
                        ...(since ? { appliedAt: dateGte } : {}),
                        ...(city ? { listing: { rentalUnit: { property: { city } } } } : {}),
                    },
                }),
            ]);

        const steps = [
            { step: "Inscriptions", count: signups },
            { step: "Annonces publiées", count: published },
            { step: "Candidatures", count: applications },
            { step: "Visites confirmées", count: confirmedVisits },
            { step: "Baux signés", count: signedLeases },
        ];

        return steps.map((s, i) => ({
            ...s,
            rate:
                i === 0
                    ? 100
                    : steps[i - 1].count === 0
                      ? 0
                      : Math.min(Math.round((s.count / steps[i - 1].count) * 10000) / 100, 100),
        }));
    } catch (error) {
        console.error("Error in getConversionFunnel", error);
        return null;
    }
}

// ─── 2. Activity Feed ────────────────────────────────────────────────────────

export async function getActivityFeed(
    limit: number = 30
): Promise<ActivityEvent[] | null> {
    if (!(await assertAdmin())) return null;

    try {
        const [
            users,
            listings,
            applications,
            visits,
            signedApps,
            messages,
            reports,
            bankConnections,
        ] = await Promise.all([
            prisma.user.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: { id: true, name: true, city: true, createdAt: true },
            }),
            prisma.listing.findMany({
                take: limit,
                where: { status: "PUBLISHED" },
                orderBy: { statusUpdatedAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    statusUpdatedAt: true,
                    rentalUnit: {
                        select: {
                            property: { select: { city: true } },
                        },
                    },
                },
            }),
            prisma.rentalApplication.findMany({
                take: limit,
                orderBy: { appliedAt: "desc" },
                select: {
                    id: true,
                    appliedAt: true,
                    candidateScope: {
                        select: {
                            creatorUser: { select: { name: true } },
                        },
                    },
                    listing: {
                        select: {
                            title: true,
                            rentalUnit: {
                                select: {
                                    property: { select: { city: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.visit.findMany({
                take: limit,
                where: { status: "CONFIRMED" },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    createdAt: true,
                    candidate: { select: { name: true } },
                    listing: {
                        select: {
                            title: true,
                            rentalUnit: {
                                select: {
                                    property: { select: { city: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.rentalApplication.findMany({
                take: limit,
                where: { leaseStatus: "SIGNED" },
                orderBy: { appliedAt: "desc" },
                select: {
                    id: true,
                    appliedAt: true,
                    candidateScope: {
                        select: {
                            creatorUser: { select: { name: true } },
                        },
                    },
                    listing: {
                        select: {
                            title: true,
                            rentalUnit: {
                                select: {
                                    property: { select: { city: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.message.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    createdAt: true,
                    sender: { select: { name: true } },
                },
            }),
            prisma.report.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    reason: true,
                    createdAt: true,
                    reporter: { select: { name: true } },
                },
            }),
            prisma.bankConnection.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    createdAt: true,
                    user: { select: { name: true } },
                },
            }),
        ]);

        const events: ActivityEvent[] = [
            ...users.map(
                (u): ActivityEvent => ({
                    type: "user_signup",
                    date: u.createdAt.toISOString(),
                    data: { id: u.id, name: u.name ?? undefined, city: u.city ?? undefined },
                })
            ),
            ...listings.map(
                (l): ActivityEvent => ({
                    type: "listing_published",
                    date: l.statusUpdatedAt.toISOString(),
                    data: {
                        id: l.id,
                        title: l.title,
                        city: l.rentalUnit?.property?.city ?? undefined,
                    },
                })
            ),
            ...applications.map(
                (a): ActivityEvent => ({
                    type: "application_sent",
                    date: a.appliedAt.toISOString(),
                    data: {
                        id: a.id,
                        name: a.candidateScope?.creatorUser?.name ?? undefined,
                        title: a.listing?.title ?? undefined,
                        city: a.listing?.rentalUnit?.property?.city ?? undefined,
                    },
                })
            ),
            ...visits.map(
                (v): ActivityEvent => ({
                    type: "visit_confirmed",
                    date: v.createdAt.toISOString(),
                    data: {
                        id: v.id,
                        name: v.candidate?.name ?? undefined,
                        title: v.listing?.title ?? undefined,
                        city: v.listing?.rentalUnit?.property?.city ?? undefined,
                    },
                })
            ),
            ...signedApps.map(
                (a): ActivityEvent => ({
                    type: "lease_signed",
                    date: a.appliedAt.toISOString(),
                    data: {
                        id: a.id,
                        name: a.candidateScope?.creatorUser?.name ?? undefined,
                        title: a.listing?.title ?? undefined,
                        city: a.listing?.rentalUnit?.property?.city ?? undefined,
                    },
                })
            ),
            ...messages.map(
                (m): ActivityEvent => ({
                    type: "message_sent",
                    date: m.createdAt.toISOString(),
                    data: {
                        id: m.id,
                        name: m.sender?.name ?? undefined,
                    },
                })
            ),
            ...reports.map(
                (r): ActivityEvent => ({
                    type: "report_created",
                    date: r.createdAt.toISOString(),
                    data: {
                        id: r.id,
                        name: r.reporter?.name ?? undefined,
                    },
                })
            ),
            ...bankConnections.map(
                (b): ActivityEvent => ({
                    type: "bank_connected",
                    date: b.createdAt.toISOString(),
                    data: {
                        id: b.id,
                        name: b.user?.name ?? undefined,
                    },
                })
            ),
        ];

        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Group consecutive messages from same user
        const groupedEvents: ActivityEvent[] = [];
        for (const event of events.slice(0, limit)) {
            const prev = groupedEvents[groupedEvents.length - 1];
            if (
                prev &&
                prev.type === 'message_sent' &&
                event.type === 'message_sent' &&
                prev.data.name === event.data.name
            ) {
                prev.data.count = (prev.data.count || 1) + 1;
            } else {
                groupedEvents.push({ ...event, data: { ...event.data, count: 1 } });
            }
        }
        return groupedEvents;
    } catch (error) {
        console.error("Error in getActivityFeed", error);
        return null;
    }
}

// ─── 3. Engagement Metrics ──────────────────────────────────────────────────

export async function getEngagementMetrics(): Promise<EngagementMetrics | null> {
    if (!(await assertAdmin())) return null;

    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            dauResult,
            wauResult,
            mauResult,
            totalUsers,
            completedProfiles,
            recentUsersCount,
            draftNeverPublished,
        ] = await Promise.all([
            prisma.message.findMany({
                where: { createdAt: { gte: oneDayAgo } },
                select: { senderId: true },
                distinct: ["senderId"],
            }),
            prisma.message.findMany({
                where: { createdAt: { gte: sevenDaysAgo } },
                select: { senderId: true },
                distinct: ["senderId"],
            }),
            prisma.message.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { senderId: true },
                distinct: ["senderId"],
            }),
            prisma.user.count(),
            prisma.user.count({
                where: {
                    city: { not: null },
                    image: { not: null },
                    tenantProfile: { jobType: { not: null } },
                },
            }),
            prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
            prisma.listing.count({
                where: {
                    status: "DRAFT",
                    createdAt: { lt: sevenDaysAgo },
                },
            }),
        ]);

        // ── Sparkline data ──────────────────────────────────────────────
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [recentMessages, extendedMessages, extendedMonthMessages] =
            await Promise.all([
                prisma.message.findMany({
                    where: { createdAt: { gte: fourteenDaysAgo } },
                    select: { senderId: true, createdAt: true },
                }),
                prisma.message.findMany({
                    where: { createdAt: { gte: eightWeeksAgo } },
                    select: { senderId: true, createdAt: true },
                }),
                prisma.message.findMany({
                    where: { createdAt: { gte: sixMonthsAgo } },
                    select: { senderId: true, createdAt: true },
                }),
            ]);

        // DAU sparkline (14 days)
        const dauSparkline: number[] = [];
        for (let i = 13; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setHours(0, 0, 0, 0);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            const uniqueSenders = new Set(
                recentMessages
                    .filter(m => m.createdAt >= dayStart && m.createdAt < dayEnd)
                    .map(m => m.senderId)
            );
            dauSparkline.push(uniqueSenders.size);
        }

        // WAU sparkline (8 weeks)
        const wauSparkline: number[] = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const uniqueSenders = new Set(
                extendedMessages
                    .filter(m => m.createdAt >= weekStart && m.createdAt < weekEnd)
                    .map(m => m.senderId)
            );
            wauSparkline.push(uniqueSenders.size);
        }

        // MAU sparkline (6 months)
        const mauSparkline: number[] = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const uniqueSenders = new Set(
                extendedMonthMessages
                    .filter(m => m.createdAt >= monthStart && m.createdAt < monthEnd)
                    .map(m => m.senderId)
            );
            mauSparkline.push(uniqueSenders.size);
        }

        return {
            dau: dauResult.length,
            wau: wauResult.length,
            mau: mauResult.length,
            profileCompletion:
                totalUsers === 0
                    ? 0
                    : Math.round((completedProfiles / totalUsers) * 10000) / 100,
            onboardingRate:
                recentUsersCount === 0 ? 0 : 0,
            draftNeverPublished,
            sparklines: {
                dau: dauSparkline,
                wau: wauSparkline,
                mau: mauSparkline,
            },
        };
    } catch (error) {
        console.error("Error in getEngagementMetrics", error);
        return null;
    }
}

// ─── 4. Rental Metrics ──────────────────────────────────────────────────────

export async function getRentalMetrics(city?: string): Promise<RentalMetrics | null> {
    if (!(await assertAdmin())) return null;

    try {
        const [
            avgDaysResult,
            totalApplications,
            totalPublishedListings,
            confirmedVisits,
            totalVisits,
            topCitiesResult,
        ] = await Promise.all([
            city
                ? prisma.$queryRaw<{ avg_days: number | null }[]>`
                    SELECT AVG(EXTRACT(EPOCH FROM (ra."appliedAt" - l."statusUpdatedAt")) / 86400) as avg_days
                    FROM "RentalApplication" ra
                    JOIN "Listing" l ON ra."listingId" = l."id"
                    JOIN "RentalUnit" ru ON l."rentalUnitId" = ru."id"
                    JOIN "Property" p ON ru."propertyId" = p."id"
                    WHERE ra."leaseStatus" = 'SIGNED'
                      AND ra."appliedAt" > l."statusUpdatedAt"
                      AND p."city" = ${city}
                `
                : prisma.$queryRaw<{ avg_days: number | null }[]>`
                    SELECT AVG(EXTRACT(EPOCH FROM (ra."appliedAt" - l."statusUpdatedAt")) / 86400) as avg_days
                    FROM "RentalApplication" ra
                    JOIN "Listing" l ON ra."listingId" = l."id"
                    WHERE ra."leaseStatus" = 'SIGNED'
                      AND ra."appliedAt" > l."statusUpdatedAt"
                `,
            prisma.rentalApplication.count({
                where: {
                    ...(city ? { listing: { rentalUnit: { property: { city } } } } : {}),
                },
            }),
            prisma.listing.count({
                where: {
                    status: "PUBLISHED",
                    ...(city ? { rentalUnit: { property: { city } } } : {}),
                },
            }),
            prisma.visit.count({
                where: {
                    status: "CONFIRMED",
                    ...(city ? { listing: { rentalUnit: { property: { city } } } } : {}),
                },
            }),
            prisma.visit.count({
                where: {
                    ...(city ? { listing: { rentalUnit: { property: { city } } } } : {}),
                },
            }),
            prisma.$queryRaw<{ city: string; count: bigint }[]>`
                SELECT p."city", COUNT(*)::bigint as count
                FROM "Listing" l
                JOIN "RentalUnit" ru ON l."rentalUnitId" = ru."id"
                JOIN "Property" p ON ru."propertyId" = p."id"
                WHERE l."status" = 'PUBLISHED'
                  AND p."city" IS NOT NULL
                GROUP BY p."city"
                ORDER BY count DESC
                LIMIT 5
            `,
        ]);

        const avgDays = avgDaysResult[0]?.avg_days;

        return {
            avgDaysToLease:
                avgDays !== null && avgDays !== undefined
                    ? Math.round(Number(avgDays) * 100) / 100
                    : null,
            avgApplicationsPerListing:
                totalPublishedListings === 0
                    ? null
                    : Math.round((totalApplications / totalPublishedListings) * 100) / 100,
            visitAcceptanceRate:
                totalVisits === 0
                    ? null
                    : Math.round((confirmedVisits / totalVisits) * 10000) / 100,
            topCities: topCitiesResult.map((r) => ({
                city: r.city,
                count: Number(r.count),
            })),
        };
    } catch (error) {
        console.error("Error in getRentalMetrics", error);
        return null;
    }
}

// ─── 5. Geo Distribution ────────────────────────────────────────────────────

export async function getGeoDistribution(): Promise<GeoDistributionEntry[] | null> {
    if (!(await assertAdmin())) return null;

    try {
        const result = await prisma.$queryRaw<{ city: string; count: bigint }[]>`
            SELECT p."city", COUNT(*)::bigint as count
            FROM "Listing" l
            JOIN "RentalUnit" ru ON l."rentalUnitId" = ru."id"
            JOIN "Property" p ON ru."propertyId" = p."id"
            WHERE l."status" = 'PUBLISHED'
              AND p."city" IS NOT NULL
            GROUP BY p."city"
            ORDER BY count DESC
            LIMIT 20
        `;

        return result.map((r) => ({
            city: r.city,
            count: Number(r.count),
        }));
    } catch (error) {
        console.error("Error in getGeoDistribution", error);
        return null;
    }
}

// ─── 6. Plan Distribution ───────────────────────────────────────────────────

export async function getPlanDistribution(): Promise<PlanDistributionData | null> {
    if (!(await assertAdmin())) return null;

    try {
        const [planGroups, activeBankConnections, verifiedTenants, processedTransactions] =
            await Promise.all([
                prisma.user.groupBy({
                    by: ["plan"],
                    _count: { id: true },
                }),
                prisma.bankConnection.count({
                    where: { isActive: true },
                }),
                prisma.tenantProfile.count({
                    where: { rentVerified: true },
                }),
                prisma.bankTransaction.count({
                    where: { isProcessed: true },
                }),
            ]);

        return {
            plans: planGroups.map((g) => ({
                plan: g.plan,
                count: g._count.id,
            })),
            activeBankConnections,
            verifiedTenants,
            processedTransactions,
        };
    } catch (error) {
        console.error("Error in getPlanDistribution", error);
        return null;
    }
}

// ─── 7. Cities ─────────────────────────────────────────────────────────────

export async function getCities(): Promise<string[] | null> {
    if (!(await assertAdmin())) return null;
    try {
        const result = await prisma.$queryRaw<{ city: string }[]>`
            SELECT DISTINCT p."city"
            FROM "Listing" l
            JOIN "RentalUnit" ru ON l."rentalUnitId" = ru."id"
            JOIN "Property" p ON ru."propertyId" = p."id"
            WHERE l."status" = 'PUBLISHED'
              AND p."city" IS NOT NULL
            ORDER BY p."city"
        `;
        return result.map(r => r.city);
    } catch (error) {
        console.error("Error in getCities", error);
        return null;
    }
}

// ─── 8. Subscription Metrics ───────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = {
    PLUS: 9.99,
    PRO: 19.99,
};

export async function getSubscriptionMetrics(): Promise<SubscriptionMetricsData | null> {
    if (!(await assertAdmin())) return null;

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [
            activeSubscriptions,
            activeGifts,
            recentChurned,
            activeThirtyDaysAgo,
            upcomingExpirations,
            planStatusGroups,
        ] = await Promise.all([
            // Total active subscriptions (ACTIVE or GIFTED status)
            prisma.subscription.count({
                where: {
                    status: { in: ["ACTIVE", "GIFTED"] },
                },
            }),
            // Active gifts (isGifted=true AND status=ACTIVE)
            prisma.subscription.count({
                where: {
                    isGifted: true,
                    status: "ACTIVE",
                },
            }),
            // Cancelled in last 30 days (for churn numerator)
            prisma.subscription.count({
                where: {
                    status: { in: ["EXPIRED", "CANCELLED"] },
                    updatedAt: { gte: thirtyDaysAgo },
                },
            }),
            // Subscriptions that were active 30 days ago (approximation for churn denominator)
            prisma.subscription.count({
                where: {
                    OR: [
                        { status: { in: ["ACTIVE", "GIFTED"] } },
                        {
                            status: { in: ["EXPIRED", "CANCELLED"] },
                            updatedAt: { gte: thirtyDaysAgo },
                        },
                    ],
                },
            }),
            // Subscriptions with endDate within next 7 days
            prisma.subscription.count({
                where: {
                    status: { in: ["ACTIVE", "GIFTED"] },
                    endDate: {
                        gte: now,
                        lte: sevenDaysFromNow,
                    },
                },
            }),
            // Plan + status breakdown for all subscriptions
            prisma.subscription.groupBy({
                by: ["plan", "status"],
                _count: { id: true },
            }),
        ]);

        // Build plan breakdown with per-status counts
        const planMap = new Map<string, { active: number; expired: number; cancelled: number; gifted: number }>();
        for (const group of planStatusGroups) {
            if (!planMap.has(group.plan)) {
                planMap.set(group.plan, { active: 0, expired: 0, cancelled: 0, gifted: 0 });
            }
            const entry = planMap.get(group.plan)!;
            switch (group.status) {
                case "ACTIVE":
                    entry.active = group._count.id;
                    break;
                case "EXPIRED":
                    entry.expired = group._count.id;
                    break;
                case "CANCELLED":
                    entry.cancelled = group._count.id;
                    break;
                case "GIFTED":
                    entry.gifted = group._count.id;
                    break;
            }
        }

        const planBreakdown = Array.from(planMap.entries()).map(([plan, counts]) => ({
            plan,
            ...counts,
        }));

        // Calculate MRR from active subscriptions
        let mrr = 0;
        for (const entry of planBreakdown) {
            const price = PLAN_PRICES[entry.plan] || 0;
            mrr += price * (entry.active + entry.gifted);
        }
        mrr = Math.round(mrr * 100) / 100;

        // Calculate churn rate (% cancelled in last 30d vs total that were active 30d ago)
        const churnRate =
            activeThirtyDaysAgo === 0
                ? 0
                : Math.round((recentChurned / activeThirtyDaysAgo) * 10000) / 100;

        return {
            activeSubscriptions,
            mrr,
            churnRate,
            activeGifts,
            upcomingExpirations,
            planBreakdown,
        };
    } catch (error) {
        console.error("Error in getSubscriptionMetrics", error);
        return null;
    }
}
