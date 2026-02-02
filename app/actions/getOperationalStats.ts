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

        // 1. Fetch all Rental Units for Occupancy
        const properties = await prisma.property.findMany({
            where: { ownerId: currentUser.id },
            include: {
                rentalUnits: {
                    include: {
                        listings: {
                            include: {
                                applications: {
                                    where: {
                                        leaseStatus: 'SIGNED'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        let totalUnits = 0;
        let occupiedUnits = 0;

        (properties as any[]).forEach(property => {
            property.rentalUnits.forEach((unit: any) => {
                totalUnits++;
                let isUnitOccupied = false;

                // Check if any listing for this unit has a signed lease
                if (unit.listings && unit.listings.length > 0) {
                    unit.listings.forEach((listing: any) => {
                        // Check Signed Leases
                        if (listing.applications && listing.applications.length > 0) {
                            isUnitOccupied = true;
                        }
                    });
                }

                if (isUnitOccupied) occupiedUnits++;
            });
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
