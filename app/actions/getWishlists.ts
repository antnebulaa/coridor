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
                        rentalUnit: {
                            include: {
                                images: true,
                                property: {
                                    include: {
                                        images: true
                                    }
                                }
                            }
                        }
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

        const safeWishlists = wishlists.map((wishlist: any) => ({
            ...wishlist,
            createdAt: wishlist.createdAt.toISOString(),
            listings: wishlist.listings.map((listing: any) => ({
                id: listing.id,
                title: listing.title,
                imageSrc: listing.rentalUnit?.property?.images?.[0]?.url || listing.rentalUnit?.images?.[0]?.url,
                category: listing.rentalUnit?.property?.category,
                locationValue: listing.rentalUnit?.property?.city,
                price: listing.price
            }))
        }));

        return safeWishlists;
    } catch (error: any) {
        throw new Error(error);
    }
}
