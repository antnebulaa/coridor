import prisma from "@/libs/prismadb";

interface IParams {
    listingId?: string;
}

export default async function getListingById(
    params: IParams
) {
    try {
        const { listingId } = params;

        const listing = await prisma.listing.findUnique({
            where: {
                id: listingId,
            },
            include: {
                user: true,
                images: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                rooms: {
                    include: {
                        images: {
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    }
                },
                visitSlots: true
            }
        });

        if (!listing) {
            return null;
        }

        return {
            ...listing,
            createdAt: listing.createdAt.toISOString(),
            statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
            user: {
                ...listing.user,
                createdAt: listing.user.createdAt.toISOString(),
                updatedAt: listing.user.updatedAt.toISOString(),
                emailVerified: listing.user.emailVerified?.toISOString() || null,
                birthDate: listing.user.birthDate?.toISOString() || null,
                tenantProfile: null,
                wishlists: null,
                commuteLocations: null,
            },
            visitSlots: listing.visitSlots.map((slot: any) => ({
                ...slot,
                date: slot.date.toISOString()
            }))
        };
    } catch (error: any) {
        throw new Error(error);
    }
}
