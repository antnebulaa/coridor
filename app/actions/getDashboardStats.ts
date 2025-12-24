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
                userId: currentUser.id
            },
            include: {
                reservations: {
                    include: {
                        user: true
                    }
                },
                visitSlots: true
            }
        });

        const totalListings = listings.length;

        let totalRevenue = 0;
        let totalBookings = 0;
        let recentReservations: any[] = [];
        let listingsWithoutSlots: any[] = [];

        listings.forEach((listing: any) => {
            if (!listing.visitSlots || listing.visitSlots.length === 0) {
                listingsWithoutSlots.push({
                    id: listing.id,
                    title: listing.title
                });
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
