import prisma from '@/libs/prismadb';

/**
 * Computes and stores denormalized data for a single listing.
 * Eliminates the need for 4-level deep includes in getListings queries.
 *
 * Call this after any create/update on:
 * - Listing (create, update)
 * - Property (location, amenities, diagnostics)
 * - RentalUnit (surface, furnishing)
 * - PropertyImage (add, delete, reorder, move)
 */
export async function syncListingCardData(listingId: string) {
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
            rentalUnit: {
                include: {
                    property: {
                        include: {
                            owner: {
                                select: {
                                    id: true,
                                    name: true,
                                    image: true,
                                    firstName: true,
                                    lastName: true,
                                    bio: true,
                                    languages: true,
                                    averageResponseTime: true,
                                    responseRate: true,
                                    lastActiveAt: true,
                                    createdAt: true,
                                    updatedAt: true,
                                }
                            },
                            images: {
                                include: { room: true },
                                orderBy: { order: 'asc' },
                            },
                            rooms: {
                                include: {
                                    images: { orderBy: { order: 'asc' } }
                                }
                            }
                        }
                    },
                    images: { orderBy: { order: 'asc' } },
                    targetRoom: {
                        include: {
                            images: { orderBy: { order: 'asc' } }
                        }
                    }
                }
            }
        }
    });

    if (!listing) return;

    const property = listing.rentalUnit.property;
    const unit = listing.rentalUnit;

    // --- Aggregate images (same logic as getListings facade mapper) ---
    const unitImages = unit.images || [];
    const targetRoomImages = unit.targetRoom?.images || [];
    const targetRoomId = unit.targetRoom?.id;
    const propertyImagesRaw = property.images || [];

    // Filter out images of OTHER bedrooms (keep common areas + target room)
    const propertyImages = propertyImagesRaw.filter((img: any) => {
        if (!img.roomId) return true;
        if (img.roomId === targetRoomId) return true;
        return img.room && !img.room.name.toLowerCase().startsWith('chambre');
    });

    const rooms = property.rooms || [];
    const roomsImages = rooms.flatMap((room: any) => {
        if (room.id !== targetRoomId && room.name.toLowerCase().startsWith('chambre')) {
            return [];
        }
        return room.images || [];
    });

    const allImages = [...unitImages, ...targetRoomImages, ...propertyImages, ...roomsImages];
    const uniqueUrls = new Set<string>();
    const aggregatedImages = allImages.filter((img: any) => {
        if (uniqueUrls.has(img.url)) return false;
        uniqueUrls.add(img.url);
        return true;
    });

    // --- Build cardData ---
    const cardData = {
        // Location
        country: property.country,
        district: property.district,
        neighborhood: property.neighborhood,
        addressLine1: property.addressLine1,
        building: property.building,
        apartment: property.apartment,

        // Property characteristics
        floor: property.floor,
        totalFloors: property.totalFloors,
        buildYear: property.constructionYear,
        heatingSystem: property.heatingSystem,
        glazingType: property.glazingType,
        dpe: property.dpe,
        ges: property.ges,
        dpe_year: property.dpe_year,
        energy_cost_min: property.energy_cost_min,
        energy_cost_max: property.energy_cost_max,
        propertySubType: property.propertySubType ?? null,
        isLastFloor: (property as any).isLastFloor ?? (property.floor != null && property.totalFloors != null && property.floor > 0 && property.floor === property.totalFloors),

        // RentalUnit
        isFurnished: unit.isFurnished,
        rentalUnitType: unit.type,

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
        hasStorage: property.hasStorage ?? false,
        hasLaundry: property.hasLaundry ?? false,
        hasArmoredDoor: property.hasArmoredDoor ?? false,
        hasConcierge: property.hasConcierge ?? false,
        hasAutomaticDoors: property.hasAutomaticDoors ?? false,
        hasBalcony: property.hasBalcony ?? false,
        hasTerrace: property.hasTerrace ?? false,
        hasLoggia: property.hasLoggia ?? false,
        hasCourtyard: property.hasCourtyard ?? false,
        hasShutters: property.hasShutters ?? false,
        hasCave: property.hasCave ?? false,
        hasParking: property.hasParking ?? false,
        hasGarage: property.hasGarage ?? false,
        isKitchenEquipped: property.isKitchenEquipped ?? false,
        hasSeparateKitchen: property.hasSeparateKitchen ?? false,
        petsAllowed: property.petsAllowed ?? false,
        isStudentFriendly: property.isStudentFriendly ?? false,

        // Transit
        transitData: property.transitData,

        // Images (pre-aggregated, deduped)
        images: aggregatedImages.map((img: any) => ({
            id: img.id,
            url: img.url,
            label: img.room?.name || img.label || null,
            order: img.order,
        })),

        // Owner
        owner: {
            id: property.owner.id,
            name: property.owner.name,
            image: property.owner.image,
            firstName: property.owner.firstName,
            lastName: property.owner.lastName,
            bio: property.owner.bio,
            languages: property.owner.languages,
            averageResponseTime: property.owner.averageResponseTime,
            responseRate: property.owner.responseRate,
            lastActiveAt: property.owner.lastActiveAt?.toISOString(),
            createdAt: property.owner.createdAt?.toISOString(),
            updatedAt: property.owner.updatedAt?.toISOString(),
        },

        // Rooms (for detail view)
        rooms: rooms.map((room: any) => ({
            id: room.id,
            name: room.name,
            images: (room.images || []).map((img: any) => ({
                id: img.id,
                url: img.url,
                order: img.order,
            })),
        })),
    };

    // --- Update listing with denormalized data ---
    await prisma.listing.update({
        where: { id: listingId },
        data: {
            dnCity: property.city,
            dnZipCode: property.zipCode,
            dnLatitude: property.latitude,
            dnLongitude: property.longitude,
            dnCategory: property.category,
            dnOwnerId: property.ownerId,
            dnSurface: unit.surface,
            cardData,
        },
    });
}

/**
 * Syncs denormalized data for ALL listings of a property.
 * Call this when Property fields change (location, amenities, images, etc.).
 */
export async function syncPropertyListings(propertyId: string) {
    const listings = await prisma.listing.findMany({
        where: { rentalUnit: { propertyId } },
        select: { id: true },
    });

    await Promise.all(listings.map(l => syncListingCardData(l.id)));
}

/**
 * Syncs denormalized data for all listings of a rental unit.
 * Call this when RentalUnit fields change (surface, furnishing, etc.).
 */
export async function syncRentalUnitListings(rentalUnitId: string) {
    const listings = await prisma.listing.findMany({
        where: { rentalUnitId },
        select: { id: true },
    });

    await Promise.all(listings.map(l => syncListingCardData(l.id)));
}
