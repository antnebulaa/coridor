import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getAllFavorites() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const favorites = await prisma.listing.findMany({
            where: {
                wishlists: {
                    some: {
                        userId: currentUser.id
                    }
                }
            },
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const safeFavorites = favorites.map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            imageSrc: listing.rentalUnit?.property?.images?.[0]?.url || listing.rentalUnit?.images?.[0]?.url,
            category: listing.rentalUnit?.property?.category,
            locationValue: listing.rentalUnit?.property?.city,
            price: listing.price
        }));

        return safeFavorites;
    } catch (error: any) {
        throw new Error(error);
    }
}
