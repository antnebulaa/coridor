import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getFavoriteListings() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const favorites = await prisma.listing.findMany({
            where: {
                id: {
                    in: [...(currentUser.favoriteIds || [])]
                }
            },
            include: {
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                images: true
                            }
                        }
                    }
                }
            }
        });

        const safeFavorites = favorites.map((favorite: any) => ({
            ...favorite,
            createdAt: favorite.createdAt.toISOString(),
            statusUpdatedAt: favorite.statusUpdatedAt.toISOString()
        }));

        return safeFavorites;
    } catch (error: any) {
        throw new Error(error);
    }
}
