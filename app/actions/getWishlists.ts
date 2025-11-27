import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getWishlists() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const wishlists = await prisma.wishlist.findMany({
            where: {
                userId: currentUser.id
            },
            include: {
                listings: {
                    take: 1,
                    include: {
                        images: true
                    }
                },
                _count: {
                    select: { listings: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const safeWishlists = wishlists.map((wishlist) => ({
            ...wishlist,
            createdAt: wishlist.createdAt.toISOString(),
            listings: wishlist.listings.map((listing) => ({
                ...listing,
                createdAt: listing.createdAt.toISOString()
            }))
        }));

        return safeWishlists;
    } catch (error: any) {
        throw new Error(error);
    }
}
