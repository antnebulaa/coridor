import prisma from "@/libs/prismadb";

interface IParams {
    listingId?: string;
    userId?: string;
    authorId?: string;
}

export default async function getReservations(
    params: IParams
) {
    try {
        const { listingId, userId, authorId } = params;

        const query: any = {};

        if (listingId) {
            query.listingId = listingId;
        }

        if (userId) {
            query.userId = userId;
        }

        if (authorId) {
            query.listing = {
                rentalUnit: {
                    property: {
                        ownerId: authorId
                    }
                }
            };
        }

        const reservations = await prisma.reservation.findMany({
            where: query,
            include: {
                listing: {
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
                },
                user: {
                    include: {
                        tenantProfile: {
                            include: {
                                guarantors: true,
                                additionalIncomes: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const safeReservations = reservations.map(
            (reservation: any) => ({
                ...reservation,
                createdAt: reservation.createdAt.toISOString(),
                startDate: reservation.startDate.toISOString(),
                endDate: reservation.endDate.toISOString(),
                listing: {
                    ...reservation.listing,
                    createdAt: reservation.listing.createdAt.toISOString(),
                    statusUpdatedAt: reservation.listing.statusUpdatedAt.toISOString(),
                },
                user: {
                    ...reservation.user,
                    createdAt: reservation.user.createdAt.toISOString(),
                    updatedAt: reservation.user.updatedAt.toISOString(),
                    emailVerified: reservation.user.emailVerified?.toISOString() || null,
                    birthDate: reservation.user.birthDate?.toISOString() || null,
                    tenantProfile: reservation.user.tenantProfile,
                    wishlists: null,
                    commuteLocations: null
                }
            }));

        return safeReservations;
    } catch (error: any) {
        throw new Error(error);
    }
}
