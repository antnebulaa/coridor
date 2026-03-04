import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export interface OperationalStats {
    occupancyRate: number; // Percentage 0-100
    totalUnits: number;
    occupiedUnits: number;

    pendingApplications: number;
    upcomingVisits: number;
    unpaidRents: number; // Count of late payments
}

export default async function getOperationalStats(): Promise<OperationalStats | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return null;

        // 1. Count total units and occupied units with efficient queries
        const totalUnits = await prisma.rentalUnit.count({
            where: {
                property: { ownerId: currentUser.id }
            }
        });

        const occupiedUnits = await prisma.rentalUnit.count({
            where: {
                property: { ownerId: currentUser.id },
                listings: {
                    some: {
                        applications: {
                            some: {
                                leaseStatus: 'SIGNED'
                            }
                        }
                    }
                }
            }
        });

        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        // 2. Pending Applications
        // Applications for user's listings that are PENDING or SENT
        const pendingApplications = await prisma.rentalApplication.count({
            where: {
                listing: {
                    rentalUnit: {
                        property: {
                            ownerId: currentUser.id
                        }
                    }
                },
                status: { in: ['SENT', 'PENDING', 'VISIT_PROPOSED'] }
            }
        });

        // 3. Upcoming Visists (Next 7 days)
        const upcomingVisits = await prisma.visit.count({
            where: {
                listing: {
                    rentalUnit: {
                        property: {
                            ownerId: currentUser.id
                        }
                    }
                },
                date: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                },
                status: 'CONFIRMED'
            }
        });

        // 4. Unpaid Rents
        // Logic: Find LeaseFinancials where paymentDate < Today AND status != PAID
        // This requires detailed lease financial tracking which might be complex. 
        // For now, let's look for "LATE" status if we have it, or just return 0 as placeholder if feature not fully ready.
        // We have `LeaseFinancial` but no explicit per-month payment status tracking yet in this schema view.
        // We track `financials` (History of rent amounts).
        // Let's assume 0 for now until Payment feature is robust.
        const unpaidRents = 0;

        return {
            occupancyRate: Math.round(occupancyRate),
            totalUnits,
            occupiedUnits,
            pendingApplications,
            upcomingVisits,
            unpaidRents
        };

    } catch (error: any) {
        console.error("Error fetching operational stats", error);
        return null;
    }
}
