import { RentalUnitType } from "@prisma/client";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { SafeProperty, SafeRentalUnit, SafeListing } from "@/types";

export default async function getProperties() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const properties = await prisma.property.findMany({
            where: {
                ownerId: currentUser.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                owner: true,
                images: true,
                rooms: {
                    include: {
                        images: true
                    }
                },
                rentalUnits: {
                    where: {
                        OR: [
                            { isActive: true },
                            { type: RentalUnitType.ENTIRE_PLACE }
                        ]
                    },
                    include: {
                        images: true,
                        targetRoom: {
                            include: {
                                images: true
                            }
                        },
                        listings: {
                            include: {
                                reservations: true,
                                applications: {
                                    where: {
                                        leaseStatus: 'SIGNED'
                                    },
                                    include: {
                                        financials: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Safe property mapping
        const safeProperties = properties.map((property: any) => ({
            ...property,
            createdAt: property.createdAt?.toISOString(),
            updatedAt: property.updatedAt?.toISOString(),
            owner: {
                ...property.owner,
                createdAt: property.owner.createdAt?.toISOString(),
                updatedAt: property.owner.updatedAt?.toISOString(),
                emailVerified: property.owner.emailVerified?.toISOString() || null,
                birthDate: property.owner.birthDate?.toISOString() || null,
                tenantProfile: null, // Minimal safe user
                wishlists: null,
                commuteLocations: null
            },
            rentalUnits: property.rentalUnits?.map((unit: any) => ({
                ...unit,
                listings: unit.listings?.map((listing: any) => {
                    const mappedListing: any = {
                        ...listing,
                        createdAt: listing.createdAt?.toISOString(),
                        updatedAt: listing.updatedAt?.toISOString(),
                        statusUpdatedAt: listing.statusUpdatedAt?.toISOString() || null,
                        availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,
                        rentalUnit: {
                            ...unit,
                            property: {
                                ...property,
                                createdAt: property.createdAt?.toISOString(),
                                updatedAt: property.updatedAt?.toISOString()
                            }
                        },
                        images: Array.from(new Map(
                            [
                                ...(unit.targetRoom?.images || []),
                                ...(unit.images || []),
                                ...(property.images || [])
                            ].map((img: any) => [img.id, img])
                        ).values()), // Deduplicate images by ID

                        // New Mapped Fields
                        rentalUnitType: unit.type,
                        heatingSystem: property.heatingSystem,
                        glazingType: property.glazingType,
                        dpe: property.dpe,
                        ges: property.ges,
                        dpe_year: property.dpe_year,
                        energy_cost_min: property.energy_cost_min,
                        energy_cost_max: property.energy_cost_max,
                        // Flattened fields map
                        addressLine1: property.addressLine1,
                        city: property.city,
                        district: property.district,
                        neighborhood: property.neighborhood,
                        zipCode: property.zipCode,
                        country: property.country,
                        building: property.building,
                        apartment: property.apartment,
                        category: property.category,
                        surface: unit.surface,
                        floor: property.floor,
                        totalFloors: property.totalFloors,
                        isFurnished: unit.isFurnished,
                        // ... mapped fields logic similar to getListingById
                        reservations: (listing.reservations || []).map((reservation: any) => ({
                            ...reservation,
                            createdAt: reservation.createdAt?.toISOString(),
                            startDate: reservation.startDate?.toISOString(),
                            endDate: reservation.endDate?.toISOString(),
                            listing: {
                                ...listing,
                                createdAt: listing.createdAt?.toISOString(),
                                updatedAt: listing.updatedAt?.toISOString(),
                                statusUpdatedAt: listing.statusUpdatedAt?.toISOString() || null,
                                availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,
                            }
                        })),
                        activeApplications: (listing.applications || []).map((app: any) => ({
                            ...app,
                            createdAt: app.createdAt?.toISOString(),
                            updatedAt: app.updatedAt?.toISOString(),
                            appliedAt: app.appliedAt?.toISOString(),
                            financials: (app.financials || []).map((fin: any) => ({
                                ...fin,
                                createdAt: fin.createdAt?.toISOString(),
                                startDate: fin.startDate?.toISOString(),
                                endDate: fin.endDate?.toISOString() || null
                            }))
                        })),
                    };
                    return mappedListing;
                }),
                property: {
                    ...property,
                    createdAt: property.createdAt?.toISOString(),
                    updatedAt: property.updatedAt?.toISOString(),
                    owner: {
                        ...property.owner,
                        createdAt: property.owner.createdAt?.toISOString(),
                        updatedAt: property.owner.updatedAt?.toISOString(),
                        emailVerified: property.owner.emailVerified?.toISOString() || null
                    }
                }
            }))
        }));

        return safeProperties;

    } catch (error: any) {
        // console.error("GET_PROPERTIES_ERROR", error);
        throw new Error(error);
    }
}
