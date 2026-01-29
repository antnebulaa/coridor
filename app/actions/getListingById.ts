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
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                owner: true,
                                images: {
                                    orderBy: {
                                        order: 'asc'
                                    }
                                },
                                rooms: {
                                    include: {
                                        images: true
                                    }
                                },
                                rentalUnits: {
                                    where: { isActive: true },
                                    include: {
                                        listings: true,
                                        targetRoom: {
                                            include: {
                                                images: true
                                            }
                                        },
                                        images: {
                                            orderBy: {
                                                order: 'asc'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        images: {
                            orderBy: {
                                order: 'asc'
                            }
                        },
                        targetRoom: {
                            include: {
                                images: true
                            }
                        }
                    }
                },
                applications: {
                    where: {
                        leaseStatus: 'SIGNED'
                    },
                    include: {
                        financials: {
                            orderBy: {
                                startDate: 'desc'
                            }
                        }
                    }
                }
            }
        });

        if (!listing) {
            return null;
        }

        const property = listing.rentalUnit.property;
        const unit = listing.rentalUnit;

        // Fetch User's slots manually
        const userSlots = await prisma.visitSlot.findMany({
            where: {
                userId: property.ownerId
            }
        });

        // Helper for distance (Simple Haversine)
        const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
            const R = 6371e3; // metres
            const q1 = lat1 * Math.PI / 180;
            const q2 = lat2 * Math.PI / 180;
            const dq = (lat2 - lat1) * Math.PI / 180;
            const dl = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(dq / 2) * Math.sin(dq / 2) +
                Math.cos(q1) * Math.cos(q2) *
                Math.sin(dl / 2) * Math.sin(dl / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
        };

        // Filter slots by location
        const relevantSlots = userSlots.filter((slot: any) => {
            const dist = getDistanceInMeters(slot.latitude, slot.longitude, property.latitude!, property.longitude!);
            return dist <= (slot.radius || 200);
        });

        const unitImages = listing.rentalUnit.images || [];
        const propertyImages = listing.rentalUnit.property.images || [];
        const aggregatedImages = Array.from(new Map(
            [...unitImages, ...propertyImages]
                .map(img => [img.id, img])
        ).values()).sort((a, b) => a.order - b.order);

        console.log("DEBUG: RentalUnits count:", listing.rentalUnit.property.rentalUnits?.length);
        if (listing.rentalUnit.property.rentalUnits) {
            listing.rentalUnit.property.rentalUnits.forEach((u: any, i: number) => {
                console.log(`RentalUnit ${i} images:`, u.images?.length);
            })
        }

        return {
            ...listing,
            createdAt: listing.createdAt.toISOString(),
            updatedAt: listing.updatedAt.toISOString(),
            statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
            availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,

            // Facade / Mapped Fields
            locationValue: property.address || property.city,
            city: property.city,
            country: property.country,
            district: property.district,
            neighborhood: property.neighborhood,
            addressLine1: property.addressLine1,
            building: property.building,
            apartment: property.apartment,
            zipCode: property.zipCode,
            latitude: property.latitude,
            longitude: property.longitude,
            category: property.category,

            surface: unit.surface,
            floor: property.floor,
            totalFloors: property.totalFloors,
            isFurnished: unit.isFurnished,
            buildYear: property.constructionYear,

            // New Mapped Fields
            rentalUnitType: unit.type,
            heatingSystem: property.heatingSystem || undefined,
            glazingType: property.glazingType || undefined,
            dpe: property.dpe || undefined,
            ges: property.ges || undefined,
            dpe_year: property.dpe_year,
            energy_cost_min: property.energy_cost_min,
            energy_cost_max: property.energy_cost_max,

            // Amenities
            hasElevator: property.hasElevator,
            isAccessible: property.isAccessible,
            hasFiber: property.hasFiber,
            hasBikeRoom: property.hasBikeRoom,
            hasPool: property.hasPool,
            isNearTransport: property.isNearTransport,
            hasDigicode: property.hasDigicode,
            hasIntercom: property.hasIntercom,
            hasCaretaker: property.hasCaretaker,
            isQuietArea: property.isQuietArea,
            isNearGreenSpace: property.isNearGreenSpace,
            isNearSchools: property.isNearSchools,
            isNearShops: property.isNearShops,
            isNearHospital: property.isNearHospital,

            isTraversant: property.isTraversant,
            hasGarden: property.hasGarden,
            isRefurbished: property.isRefurbished,
            isSouthFacing: property.isSouthFacing,
            isBright: property.isBright,
            hasNoOpposite: property.hasNoOpposite,
            hasView: property.hasView,
            isQuiet: property.isQuiet,
            hasBathtub: property.hasBathtub,
            hasAirConditioning: property.hasAirConditioning,

            hasStorage: false,
            hasLaundry: false,
            hasArmoredDoor: false,
            hasConcierge: false,
            hasAutomaticDoors: false,

            transitData: property.transitData,
            surfaceUnit: unit.surface ? unit.surface.toString() : null,
            isKitchenEquipped: false, // Default or map if available
            isLastFloor: property.floor === property.totalFloors,

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

            rentalUnit: {
                ...listing.rentalUnit,
                property: {
                    ...listing.rentalUnit.property,
                    createdAt: listing.rentalUnit.property.createdAt.toISOString(),
                    updatedAt: listing.rentalUnit.property.updatedAt.toISOString(),
                    owner: {
                        ...listing.rentalUnit.property.owner,
                        createdAt: listing.rentalUnit.property.owner.createdAt.toISOString(),
                        updatedAt: listing.rentalUnit.property.owner.updatedAt.toISOString(),
                        emailVerified: listing.rentalUnit.property.owner.emailVerified?.toISOString() || null,
                        birthDate: listing.rentalUnit.property.owner.birthDate?.toISOString() || null,
                        tenantProfile: null,
                        wishlists: null,
                        commuteLocations: null,
                    },
                    visitSlots: relevantSlots.map((slot: any) => ({ // Use relevant slots
                        ...slot,
                        date: slot.date.toISOString()
                    })),
                    rooms: listing.rentalUnit.property.rooms.map((room: any) => ({
                        ...room,
                        images: room.images
                    })),
                    rentalUnits: listing.rentalUnit.property.rentalUnits?.map((unit: any) => ({
                        ...unit,
                        createdAt: unit.createdAt?.toISOString() || null,
                        updatedAt: unit.updatedAt?.toISOString() || null,
                        listings: unit.listings?.map((l: any) => ({
                            ...l,
                            createdAt: l.createdAt?.toISOString() || null,
                            statusUpdatedAt: l.statusUpdatedAt?.toISOString() || null,
                            availableFrom: l.availableFrom?.toISOString() || null,
                            surface: unit.surface,
                            roomCount: unit.roomCount,
                            bathroomCount: unit.bathroomCount,
                            guestCount: unit.guestCount,
                            bedType: unit.bedType,
                            hasPrivateBathroom: unit.hasPrivateBathroom,
                            images: unit.images
                        }))
                    }))
                },
                images: listing.rentalUnit.images,
                targetRoom: listing.rentalUnit.targetRoom ? {
                    ...listing.rentalUnit.targetRoom,
                    images: listing.rentalUnit.targetRoom.images || []
                } : null,
                listings: []
            },

            images: aggregatedImages,
            rooms: listing.rentalUnit.property.rooms.map((room: any) => ({
                ...room,
                images: room.images
            })),
            visitSlots: relevantSlots.map((slot: any) => ({ // Use relevant slots
                ...slot,
                date: slot.date.toISOString()
            })),
            user: {
                ...listing.rentalUnit.property.owner,
                createdAt: listing.rentalUnit.property.owner.createdAt.toISOString(),
                updatedAt: listing.rentalUnit.property.owner.updatedAt.toISOString(),
                emailVerified: listing.rentalUnit.property.owner.emailVerified?.toISOString() || null,
                birthDate: listing.rentalUnit.property.owner.birthDate?.toISOString() || null,
                tenantProfile: null,
                wishlists: null,
                commuteLocations: null,
            },
            userGlobalSlots: userSlots.map((slot: any) => ({
                ...slot,
                date: slot.date.toISOString()
            }))
        };
    } catch (error: any) {
        throw new Error(error);
    }
}
