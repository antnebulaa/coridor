import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getApplications() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        console.log("DEBUG: Fetching applications for user:", currentUser.id);

        const applications = await prisma.rentalApplication.findMany({
            where: {
                candidateScope: {
                    OR: [
                        { creatorUserId: currentUser.id },
                        { membersIds: { has: currentUser.id } }
                    ]
                }
            },
            include: {
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        images: true
                                    }
                                },
                                images: true
                            }
                        }
                    }
                },
                candidateScope: true
            },
            orderBy: {
                appliedAt: 'desc'
            }
        });

        console.log("DEBUG: Found applications:", applications.length);

        const safeApplications = applications.map((application) => ({
            ...application,
            appliedAt: application.appliedAt.toISOString(),
            listing: {
                ...application.listing,
                createdAt: application.listing.createdAt.toISOString(),
                updatedAt: application.listing.updatedAt.toISOString(),
                statusUpdatedAt: application.listing.statusUpdatedAt.toISOString(),
                availableFrom: application.listing.availableFrom ? application.listing.availableFrom.toISOString() : null,
                rentalUnit: {
                    ...application.listing.rentalUnit,
                    property: {
                        ...application.listing.rentalUnit.property,
                        createdAt: application.listing.rentalUnit.property.createdAt.toISOString(),
                        updatedAt: application.listing.rentalUnit.property.updatedAt.toISOString(),
                    }
                }
            },
            candidateScope: {
                ...application.candidateScope,
                createdAt: application.candidateScope.createdAt.toISOString(),
                targetMoveInDate: application.candidateScope.targetMoveInDate ? application.candidateScope.targetMoveInDate.toISOString() : null
            }
        }));

        return safeApplications;
    } catch (error: any) {
        throw new Error(error);
    }
}
