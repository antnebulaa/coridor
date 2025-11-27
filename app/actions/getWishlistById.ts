import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

interface IParams {
    wishlistId?: string;
}

export default async function getWishlistById(
    params: IParams
) {
    try {
        const { wishlistId } = params;
        const currentUser = await getCurrentUser();

        if (!wishlistId || !currentUser) {
            return null;
        }

        const wishlist = await prisma.wishlist.findUnique({
            where: {
                id: wishlistId,
                userId: currentUser.id
            },
            include: {
                listings: {
                    include: {
                        images: true
                    }
                }
            }
        });

        if (!wishlist) {
            return null;
        }

        return {
            ...wishlist,
            createdAt: wishlist.createdAt.toISOString(),
            listings: wishlist.listings.map((listing) => ({
                ...listing,
                createdAt: listing.createdAt.toISOString()
            }))
        };
    } catch (error: any) {
        throw new Error(error);
    }
}
