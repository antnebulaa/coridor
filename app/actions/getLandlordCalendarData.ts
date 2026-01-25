import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export default async function getLandlordCalendarData() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return null;
        }

        // 1. Fetch Availability Slots (User Centric)
        const visitSlots = await prisma.visitSlot.findMany({
            where: {
                userId: currentUser.id
            }
        });

        // 2. Fetch Properties (Context for bookings)
        const properties = await prisma.property.findMany({
            where: {
                ownerId: currentUser.id
            },
            include: {
                rentalUnits: {
                    include: {
                        listings: {
                            select: {
                                id: true,
                                title: true,
                                propertyAdjective: true,
                                rentalUnit: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // 3. Fetch Scheduled Visits (Bookings)
        // Visits are linked to Listings, which are linked to Properties owned by CurrentUser
        const visits = await prisma.visit.findMany({
            where: {
                listing: {
                    rentalUnit: {
                        property: {
                            ownerId: currentUser.id
                        }
                    }
                }
            },
            include: {
                listing: {
                    select: {
                        title: true,
                        propertyAdjective: true,
                        rentalUnit: {
                            select: {
                                property: {
                                    select: {
                                        category: true,
                                        city: true
                                    }
                                }
                            }
                        }
                    }
                },
                candidate: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        email: true
                    }
                }
            }
        });

        // Serialization
        const safeSlots = visitSlots.map((slot: any) => ({
            ...slot,
            date: slot.date.toISOString()
        }));

        const safeProperties = properties.map((prop: any) => ({
            ...prop,
            createdAt: prop.createdAt.toISOString(),
            updatedAt: prop.updatedAt.toISOString(),
        }));

        const safeVisits = visits.map((visit: any) => ({
            ...visit,
            date: visit.date.toISOString(),
            createdAt: visit.createdAt.toISOString(),
            listing: {
                ...visit.listing,
                category: visit.listing.rentalUnit.property.category || 'Logement', // Flatten for easier usage
                city: visit.listing.rentalUnit.property.city
            }
        }));

        return {
            slots: safeSlots, // NEW: Top level slots
            properties: safeProperties,
            visits: safeVisits
        };

    } catch (error: any) {
        console.error("GET_CALENDAR_DATA_ERROR", error);
        return null;
    }
}
