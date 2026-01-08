import { Listing } from "@prisma/client";
import prisma from "@/libs/prismadb";
import { getIsochrone } from "@/app/libs/mapbox";

export interface IListingsParams {
    userId?: string;
    guestCount?: number;
    roomCount?: number;
    bathroomCount?: number;
    startDate?: string;
    endDate?: string;
    locationValue?: string;
    category?: string;
    city?: string;
    cities?: string;
    minPrice?: number;
    maxPrice?: number;
    minSurface?: number;
    maxSurface?: number;
    // Commute Params
    commuteLatitude?: number;
    commuteLongitude?: number;
    commuteTransportMode?: string;
    commuteMaxTime?: number;
    commute?: string; // JSON Array of CommutePoint
    sort?: string;
    isPublished?: boolean; // NEW: Allow filtering by published status
}

export default async function getListings(
    params: IListingsParams
) {
    try {
        const {
            userId,
            roomCount,
            guestCount,
            bathroomCount,
            locationValue,
            startDate,
            endDate,
            category,
            minPrice,
            maxPrice,
            minSurface,
            maxSurface,
            commuteLatitude,
            commuteLongitude,
            commuteTransportMode,
            commuteMaxTime,
            commute,
            sort,
            isPublished
        } = params;

        // ...

        let query: any = {};
        let commuteIds: string[] | null = null;
        let commutePoints: any[] = [];

        if (commute) {
            try {
                const parsed = JSON.parse(commute);
                if (Array.isArray(parsed)) {
                    commutePoints = parsed;
                }
            } catch (e) {
                console.error("Failed to parse commute params", e);
            }
        } else if (commuteLatitude && commuteLongitude && commuteTransportMode && commuteMaxTime) {
            commutePoints = [{
                lat: commuteLatitude,
                lng: commuteLongitude,
                mode: commuteTransportMode,
                time: commuteMaxTime
            }];
        }

        // Commute Filtering Logic with RAW SQL Join
        if (commutePoints.length > 0) {
            console.log(`Processing ${commutePoints.length} commute points...`);
            let validIds: Set<string> | null = null;

            for (const point of commutePoints) {
                const { lat, lng, mode, time } = point;

                const isochrone = await getIsochrone(
                    [+lng, +lat],
                    mode,
                    +time
                );

                let currentPointIds: string[] = [];

                if (isochrone && isochrone.features && isochrone.features.length > 0) {
                    const geometry = isochrone.features[0].geometry;
                    const geoJsonString = JSON.stringify(geometry);

                    const rawLists = await prisma.$queryRaw<{ id: string }[]>`
                        SELECT l.id 
                        FROM "Listing" l
                        JOIN "RentalUnit" ru ON l."rentalUnitId" = ru.id
                        JOIN "Property" p ON ru."propertyId" = p.id
                        WHERE p."latitude" IS NOT NULL 
                        AND p."longitude" IS NOT NULL
                        AND ST_Within(
                            ST_SetSRID(ST_MakePoint(p."longitude", p."latitude"), 4326),
                            ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonString}), 4326)
                        )
                    `;
                    currentPointIds = rawLists.map((l: any) => l.id);
                }

                const currentSet = new Set(currentPointIds);
                if (validIds === null) {
                    validIds = currentSet;
                } else {
                    const previousIds: string[] = Array.from(validIds as Set<string>);
                    const intersected: string[] = previousIds.filter((id: string) => currentSet.has(id));
                    validIds = new Set(intersected);
                }

                if (validIds && validIds.size === 0) {
                    break;
                }
            }

            if (validIds) {
                commuteIds = Array.from(validIds);
                if (commuteIds.length === 0) {
                    query.id = { in: [] };
                } else {
                    query.id = { in: commuteIds };
                }
            }
        }

        // Handle isPublished filter
        // Logic:
        // Default (Public): isPublished = true
        // Owner Dashboard: want ALL (Draft + Published).
        // If isPublished is passed explicitly as null, we show ALL (do not filter).
        // If passed as boolean, we filter.

        if (typeof isPublished !== 'undefined') {
            if (isPublished !== null) {
                query.isPublished = isPublished;
            }
            // If null, we do NOT set query.isPublished, thus returning all.
        } else {
            // Default to showing only published
            query.isPublished = true;
        }

        if (minPrice && maxPrice) {
            query.price = {
                gte: +minPrice,
                lte: +maxPrice
            };
        }

        if (startDate && endDate) {
            query.NOT = {
                reservations: {
                    some: {
                        OR: [
                            { endDate: { gte: startDate }, startDate: { lte: startDate } },
                            { startDate: { lte: endDate }, endDate: { gte: endDate } }
                        ]
                    }
                }
            };
        }

        const rentalUnitQuery: any = {
            isActive: true
        };

        if (roomCount) {
            query.roomCount = { gte: +roomCount };
        }

        if (minSurface && maxSurface) {
            rentalUnitQuery.surface = {
                gte: +minSurface,
                lte: +maxSurface
            };
        }

        const propertyQuery: any = {};

        if (userId) {
            propertyQuery.ownerId = userId;
        }

        if (category) {
            const categories = category.split(',');
            if (categories.length > 0) {
                propertyQuery.category = { in: categories };
            }
        }

        if (params.cities) {
            const cities = params.cities.split(',');
            if (cities.length > 0) {
                propertyQuery.OR = cities.map((city: string) => ({
                    city: { contains: city, mode: 'insensitive' }
                }));
            }
        } else if (params.city) {
            propertyQuery.city = { contains: params.city, mode: 'insensitive' };
        }

        if (locationValue) {
            propertyQuery.country = locationValue;
        }

        query.rentalUnit = {
            ...rentalUnitQuery,
            property: propertyQuery
        };

        if (commuteIds && commuteIds.length > 0) {
            query.id = { in: commuteIds };
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        const listings = await prisma.listing.findMany({
            where: query,
            include: {
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                owner: true,
                                images: true,
                                visitSlots: true,
                            }
                        },
                        images: true,
                        targetRoom: true
                    }
                },
            },
            orderBy: orderBy
        });

        // Mapper to SafeListing with Flattened Facade
        const safeListings = listings.map((listing: any) => {
            const unitImages = listing.rentalUnit.images || [];
            const propertyImages = listing.rentalUnit.property.images || [];
            const aggregatedImages = [...unitImages, ...propertyImages];

            const property = listing.rentalUnit.property;
            const unit = listing.rentalUnit;

            return {
                ...listing,
                createdAt: listing.createdAt.toISOString(),
                statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
                availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,

                // Mapped Fields for Facade
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
                heatingSystem: property.heatingSystem,
                glazingType: property.glazingType,
                dpe: property.dpe,
                ges: property.ges,
                dpe_year: property.dpe_year,
                energy_cost_min: property.energy_cost_min,
                energy_cost_max: property.energy_cost_max,

                // Amenities (Union of Property + Unit)
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
                            birthDate: listing.rentalUnit.property.owner.birthDate?.toISOString() || null
                        },
                        visitSlots: listing.rentalUnit.property.visitSlots.map((slot: any) => ({
                            ...slot,
                            date: slot.date.toISOString()
                        }))
                    },
                    images: listing.rentalUnit.images
                },
                images: aggregatedImages,
                user: listing.rentalUnit.property.owner
            };
        });

        return safeListings;

    } catch (error: any) {
        throw new Error(error);
    }
}
