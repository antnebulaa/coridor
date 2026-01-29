import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getVisits() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const visits = await prisma.visit.findMany({
            where: {
                candidateId: currentUser.id,
                status: {
                    in: ['CONFIRMED', 'CANCELLED']
                },
                date: {
                    gte: new Date() // Keep future dates only? Or all history? User said "Keep trace".
                    // Usually "trace" implies history.
                    // But maybe just future slots that were cancelled?
                    // Let's assume future for now as it's a dashboard of "Coming up".
                    // If they want history, we might need a separate tab or section.
                    // Let's stick to >= Date() for now to avoid cluttering with old cancelled stuff.
                    // Actually, if I cancel a meeting today, I want to see it today.
                }
            },
            include: {
                listing: {
                    include: {
                        conversations: {
                            where: {
                                users: {
                                    some: {
                                        id: currentUser.id
                                    }
                                }
                            },
                            select: {
                                id: true
                            }
                        },
                        rentalUnit: {
                            include: {
                                images: true, // Fetch Unit Images
                                property: {
                                    include: {
                                        owner: true,
                                        images: true // Fetch Common Images
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        const safeVisits = visits.map((visit) => {
            console.log(`DEBUG: Visit ${visit.id} - Listing ${visit.listing.id}`);
            console.log(`DEBUG: Conversations found:`, visit.listing.conversations?.length);
            if (visit.listing.conversations?.length > 0) {
                console.log(`DEBUG: Conversation ID:`, visit.listing.conversations[0].id);
            }

            // Aggregate Images
            const unitImages = visit.listing.rentalUnit.images || [];
            const propertyImages = visit.listing.rentalUnit.property.images || [];
            const aggregatedImages = Array.from(new Map(
                [...unitImages, ...propertyImages]
                    .map(img => [img.id, img])
            ).values()).sort((a, b) => a.order - b.order);

            return {
                ...visit,
                createdAt: visit.createdAt.toISOString(),
                date: visit.date.toISOString(),
                listing: {
                    ...visit.listing,
                    createdAt: visit.listing.createdAt.toISOString(),
                    updatedAt: visit.listing.updatedAt.toISOString(),
                    statusUpdatedAt: visit.listing.statusUpdatedAt.toISOString(),
                    availableFrom: visit.listing.availableFrom ? visit.listing.availableFrom.toISOString() : null,
                    images: aggregatedImages,
                    rentalUnit: {
                        ...visit.listing.rentalUnit,
                        property: {
                            ...visit.listing.rentalUnit.property,
                            createdAt: visit.listing.rentalUnit.property.createdAt.toISOString(),
                            updatedAt: visit.listing.rentalUnit.property.updatedAt.toISOString(),
                            owner: {
                                ...visit.listing.rentalUnit.property.owner,
                                createdAt: visit.listing.rentalUnit.property.owner.createdAt.toISOString(),
                                updatedAt: visit.listing.rentalUnit.property.owner.updatedAt.toISOString(),
                                emailVerified: visit.listing.rentalUnit.property.owner.emailVerified?.toISOString() || null,
                                birthDate: visit.listing.rentalUnit.property.owner.birthDate?.toISOString() || null
                            }
                        }
                    }
                }
            };
        });

        return safeVisits;
    } catch (error: any) {
        throw new Error(error);
    }
}
