import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import prisma from "@/libs/prismadb";
import { SafeUser } from "@/types";
import { cache } from "react";

export async function getSession() {
    return await getServerSession(authOptions);
}

const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
    try {
        const session = await getSession();

        const userEmail = session?.user?.email;
        const userId = (session?.user as any)?.id;

        if (!userEmail && !userId) {
            return null;
        }

        const currentUser = await prisma.user.findUnique({
            where: userId ? {
                id: userId
            } : {
                email: userEmail as string,
            },
            include: {
                wishlists: {
                    include: {
                        listings: {
                            select: {
                                id: true
                            }
                        }
                    }
                },
                tenantProfile: true,
                commuteLocations: true // NEW: Fetch commute locations
            }
        });

        if (!currentUser) {
            return null;
        }

        const safeWishlists = currentUser.wishlists.map((wishlist: any) => ({
            ...wishlist,
            createdAt: wishlist.createdAt.toISOString(),
            listings: wishlist.listings.map((listing: any) => ({ id: listing.id }))
        }));

        const safeCommuteLocations = (currentUser as any).commuteLocations.map((location: any) => ({
            ...location,
            createdAt: location.createdAt.toISOString(),
            updatedAt: location.updatedAt.toISOString(),
        }));

        const safeUser = {
            ...currentUser,
            createdAt: currentUser.createdAt.toISOString(),
            updatedAt: currentUser.updatedAt.toISOString(),
            emailVerified: currentUser.emailVerified?.toISOString() || null,
            birthDate: currentUser.birthDate?.toISOString() || null,
            wishlists: safeWishlists,
            commuteLocations: safeCommuteLocations, // NEW
            userMode: currentUser.userMode,
            plan: (currentUser as any).plan || 'FREE', // Fallback to FREE if missing, though it shouldn't be
        };

        return safeUser;
    } catch (error: any) {
        return null;
    }
});

export default getCurrentUser;

