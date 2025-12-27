import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getDashboardStats() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return null;
        }

        const listings = await prisma.listing.findMany({
            where: {
                rentalUnit: {
                    property: {
                        ownerId: currentUser.id
                    }
                }
            },
            include: {
                reservations: {
                    include: {
                        user: true
                    }
                },
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                visitSlots: true
                            }
                        }
                    }
                }
            }
        });

        const totalListings = listings.length;

        let totalRevenue = 0;
        let totalBookings = 0;
        let recentReservations: any[] = [];
        let listingsWithoutSlots: any[] = [];

        const seenPropertyIds = new Set<string>();

        listings.forEach((listing: any) => {
            const property = listing.rentalUnit?.property;
            if (!property) return;

            // Identify property unique constraints for alerts
            if (!seenPropertyIds.has(property.id)) {
                const propertySlots = property.visitSlots || [];

                if (propertySlots.length === 0) {
                    seenPropertyIds.add(property.id);
                    listingsWithoutSlots.push({
                        id: listing.id,
                        title: listing.title
                    });
                }
            }

            listing.reservations.forEach((reservation: any) => {
                totalRevenue += reservation.totalPrice;
                totalBookings += 1;
                recentReservations.push({
                    ...reservation,
                    listingTitle: listing.title
                });
            });
        });

        // Sort by date desc and take top 5
        recentReservations = recentReservations
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        return {
            totalListings,
            totalRevenue,
            totalBookings,
            recentReservations,
            listingsWithoutSlots
        };
    } catch (error: any) {
        throw new Error(error);
    }
}
