import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export interface AdminDashboardStats {
    counts: {
        users: number;
        usersNewThisWeek: number;
        listings: number;
        listingsPending: number;
        listingsPublished: number;
        reportsPending: number;
    };
    recentUsers: any[];
    recentListings: any[];
    recentReports: any[];
    graphData: { date: string; users: number; listings: number }[];
}

export default async function getAdminDashboardStats(): Promise<AdminDashboardStats | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return null;
        }

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // 30-day window for graphs
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch raw data for aggregation to avoid complex groupBys that might differ per DB
        // We only need the dates
        const [
            usersCount,
            usersNewCount,
            listingsCount,
            listingsPendingCount,
            listingsPublishedCount,
            reportsPendingCount,

            recentUsers,
            recentListings,
            recentReports,

            // Graph Data Raw
            usersRaw,
            listingsRaw
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
            prisma.listing.count(),
            prisma.listing.count({ where: { status: 'PENDING_REVIEW' } }),
            prisma.listing.count({ where: { status: 'PUBLISHED' } }),
            prisma.report.count({ where: { status: 'PENDING' } }),

            // Recent Users
            prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, email: true, image: true, createdAt: true, role: true }
            }),

            // Recent Listings
            prisma.listing.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                include: {
                    rentalUnit: {
                        select: {
                            property: {
                                select: {
                                    city: true,
                                    owner: { select: { name: true, email: true } }
                                }
                            }
                        }
                    }
                }
            }),

            // Recent Reports
            prisma.report.findMany({
                take: 5,
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
                include: {
                    reporter: { select: { name: true } },
                    targetUser: { select: { name: true } },
                    listing: { select: { title: true } }
                }
            }),

            // Graph Data Queries
            prisma.user.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            }),
            prisma.listing.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            })
        ]);

        const graphData = aggregateByDate(usersRaw, listingsRaw, 30);

        return {
            counts: {
                users: usersCount,
                usersNewThisWeek: usersNewCount,
                listings: listingsCount,
                listingsPending: listingsPendingCount,
                listingsPublished: listingsPublishedCount,
                reportsPending: reportsPendingCount
            },
            recentUsers,
            recentListings,
            recentReports,
            graphData
        };

    } catch (error: any) {
        console.error("Error fetching admin stats", error);
        return null;
    }
}

function aggregateByDate(users: any[], listings: any[], days: number) {
    const data: { date: string; users: number; listings: number }[] = [];
    const now = new Date();

    // Initialize map with 0s for last X days
    const map = new Map<string, { users: number; listings: number }>();

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); // "10/02"
        map.set(key, { users: 0, listings: 0 });
        data.push({ date: key, users: 0, listings: 0 }); // Initial push to preserve order
    }

    // Populate
    const process = (items: any[], type: 'users' | 'listings') => {
        items.forEach(item => {
            const key = new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (map.has(key)) {
                map.get(key)![type]++;
            }
        });
    };

    process(users, 'users');
    process(listings, 'listings');

    // Re-map to array to ensure values are updated
    return data.map(item => ({
        ...item,
        users: map.get(item.date)?.users || 0,
        listings: map.get(item.date)?.listings || 0
    }));
}
