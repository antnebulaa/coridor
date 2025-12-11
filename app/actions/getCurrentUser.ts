import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/libs/prismadb";
import { SafeUser } from "@/types";

export async function getSession() {
    return await getServerSession(authOptions);
}

export default async function getCurrentUser(): Promise<SafeUser | null> {
    try {
        const session = await getSession();

        if (!session?.user?.email) {
            return null;
        }

        const currentUser = await prisma.user.findUnique({
            where: {
                email: session.user.email as string,
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
                tenantProfile: true
            }
        });

        if (!currentUser) {
            return null;
        }

        const safeWishlists = currentUser.wishlists.map((wishlist) => ({
            ...wishlist,
            createdAt: wishlist.createdAt.toISOString(),
            listings: wishlist.listings.map((listing) => ({ id: listing.id }))
        }));

        const safeUser = {
            ...currentUser,
            createdAt: currentUser.createdAt.toISOString(),
            updatedAt: currentUser.updatedAt.toISOString(),
            emailVerified: currentUser.emailVerified?.toISOString() || null,
            birthDate: currentUser.birthDate?.toISOString() || null,
            wishlists: safeWishlists,
            userMode: currentUser.userMode,
            plan: (currentUser as any).plan || 'FREE', // Fallback to FREE if missing, though it shouldn't be
        };

        return safeUser;
    } catch (error: any) {
        return null;
    }
}
