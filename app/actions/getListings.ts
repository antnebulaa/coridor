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
    // Advanced filters
    furnished?: string;
    propertyTypes?: string;
    floorTypes?: string;
    dpeMin?: string;
    dpeMax?: string;
    amenities?: string;
    heatingTypes?: string;
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
            isPublished,
            furnished,
            propertyTypes,
            floorTypes,
            dpeMin,
            dpeMax,
            amenities: amenitiesParam,
            heatingTypes
        } = params;

        const query: any = {};
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

        // Commute Filtering — uses denormalized lat/lng (no joins!)
        if (commutePoints.length > 0) {
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

                    // Use denormalized lat/lng — no more RentalUnit/Property joins
                    const rawLists = await prisma.$queryRaw<{ id: string }[]>`
                        SELECT l.id
                        FROM "Listing" l
                        WHERE l."dnLatitude" IS NOT NULL
                        AND l."dnLongitude" IS NOT NULL
                        AND ST_Within(
                            ST_SetSRID(ST_MakePoint(l."dnLongitude", l."dnLatitude"), 4326),
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

        // isPublished filter
        if (typeof isPublished !== 'undefined') {
            if (isPublished !== null) {
                query.isPublished = isPublished;
            }
        } else {
            query.isPublished = true;
        }

        // Price filter (direct on Listing)
        if (minPrice && maxPrice) {
            query.price = {
                gte: +minPrice,
                lte: +maxPrice
            };
        }

        // Room count filter (direct on Listing)
        if (roomCount) {
            query.roomCount = { gte: +roomCount };
        }

        // Surface filter — denormalized (was on RentalUnit)
        if (minSurface && maxSurface) {
            query.dnSurface = {
                gte: +minSurface,
                lte: +maxSurface
            };
        }

        // Owner filter — denormalized (was on Property)
        if (userId) {
            query.dnOwnerId = userId;
        }

        // Category filter — denormalized (was on Property)
        if (category) {
            const categories = category.split(',');
            if (categories.length > 0) {
                query.dnCategory = { in: categories };
            }
        }

        // City filter — denormalized (was on Property)
        if (params.cities) {
            const cities = params.cities.split(',');
            if (cities.length > 0) {
                query.OR = cities.map((city: string) => ({
                    dnCity: { contains: city, mode: 'insensitive' }
                }));
            }
        } else if (params.city) {
            query.dnCity = { contains: params.city, mode: 'insensitive' };
        }

        // Advanced filters — JSONB path queries on cardData
        const cardDataConditions: any[] = [];

        if (furnished === 'furnished') {
            cardDataConditions.push({ cardData: { path: ['isFurnished'], equals: true } });
        } else if (furnished === 'unfurnished') {
            cardDataConditions.push({ cardData: { path: ['isFurnished'], equals: false } });
        }

        if (propertyTypes) {
            const types = propertyTypes.split(',');
            const typeConditions: any[] = [];
            for (const t of types) {
                if (t === 'colocation') {
                    typeConditions.push(
                        { cardData: { path: ['rentalUnitType'], equals: 'PRIVATE_ROOM' } },
                        { cardData: { path: ['rentalUnitType'], equals: 'SHARED_ROOM' } }
                    );
                } else if (t === 'classique') {
                    typeConditions.push(
                        { cardData: { path: ['rentalUnitType'], equals: 'ENTIRE_PLACE' } }
                    );
                } else {
                    typeConditions.push({ cardData: { path: ['propertySubType'], equals: t } });
                }
            }
            if (typeConditions.length > 0) {
                cardDataConditions.push({ OR: typeConditions });
            }
        }

        if (floorTypes) {
            const floors = floorTypes.split(',');
            const floorConditions: any[] = [];
            for (const f of floors) {
                if (f === 'rdc') floorConditions.push({ cardData: { path: ['floor'], equals: 0 } });
                if (f === 'lastFloor') floorConditions.push({ cardData: { path: ['isLastFloor'], equals: true } });
                if (f === 'highFloor') floorConditions.push({ cardData: { path: ['floor'], gte: 4 } });
            }
            if (floorConditions.length > 0) {
                cardDataConditions.push({ OR: floorConditions });
            }
        }

        if (dpeMin || dpeMax) {
            const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
            const minIdx = dpeMin ? grades.indexOf(dpeMin) : 0;
            const maxIdx = dpeMax ? grades.indexOf(dpeMax) : (dpeMin ? grades.indexOf(dpeMin) : 6);
            const validGrades = grades.slice(minIdx, maxIdx + 1);
            const dpeConditions = validGrades.map(g => ({ cardData: { path: ['dpe'], equals: g } }));
            if (dpeConditions.length > 0 && dpeConditions.length < 7) {
                cardDataConditions.push({ OR: dpeConditions });
            }
        }

        if (amenitiesParam) {
            const amenitiesList = amenitiesParam.split(',');
            for (const a of amenitiesList) {
                cardDataConditions.push({ cardData: { path: [a], equals: true } });
            }
        }

        if (heatingTypes) {
            const htypes = heatingTypes.split(',');
            const heatingConditions = htypes.map(h => ({ cardData: { path: ['heatingSystem'], equals: h } }));
            if (heatingConditions.length > 0) {
                cardDataConditions.push({ OR: heatingConditions });
            }
        }

        if (cardDataConditions.length > 0) {
            if (!query.AND) query.AND = [];
            if (!Array.isArray(query.AND)) query.AND = [query.AND];
            query.AND.push(...cardDataConditions);
        }

        // Minimal relation filter: RentalUnit.isActive + optional country
        const rentalUnitFilter: any = { isActive: true };
        if (locationValue) {
            rentalUnitFilter.property = { country: locationValue };
        }
        query.rentalUnit = rentalUnitFilter;

        if (commuteIds && commuteIds.length > 0) {
            query.id = { in: commuteIds };
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        // Exclude Rented Listings (Active Signed Lease)
        const excludeRentedCondition = {
            applications: {
                none: {
                    leaseStatus: 'SIGNED',
                    financials: {
                        some: {
                            OR: [
                                { endDate: null },
                                { endDate: { gt: new Date() } }
                            ]
                        }
                    }
                }
            }
        };

        if (query.AND) {
            if (Array.isArray(query.AND)) {
                query.AND.push(excludeRentedCondition);
            } else {
                query.AND = [query.AND, excludeRentedCondition];
            }
        } else {
            query.AND = [excludeRentedCondition];
        }

        // ========================================================
        // QUERY: No deep includes! cardData has all display data.
        // Only join RentalUnit for isActive filter (1 level).
        // ========================================================
        const listings = await prisma.listing.findMany({
            where: query,
            orderBy: orderBy
        });

        // Map to SafeListing-compatible shape using denormalized + cardData
        const safeListings = listings.map((listing: any) => {
            const cd = listing.cardData as any;

            // Pre-backfill safety: skip listings without cardData
            if (!cd) return null;

            const owner = cd.owner || {};

            return {
                ...listing,
                createdAt: listing.createdAt.toISOString(),
                statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
                availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,

                // Location — from denormalized columns + cardData
                city: listing.dnCity,
                country: cd.country,
                district: cd.district,
                neighborhood: cd.neighborhood,
                addressLine1: cd.addressLine1,
                building: cd.building,
                apartment: cd.apartment,
                zipCode: listing.dnZipCode,
                latitude: listing.dnLatitude,
                longitude: listing.dnLongitude,
                category: listing.dnCategory,

                // Property characteristics
                surface: listing.dnSurface,
                floor: cd.floor,
                totalFloors: cd.totalFloors,
                isFurnished: cd.isFurnished,
                buildYear: cd.buildYear,

                rentalUnitType: cd.rentalUnitType,
                heatingSystem: cd.heatingSystem,
                glazingType: cd.glazingType,
                dpe: cd.dpe,
                ges: cd.ges,
                dpe_year: cd.dpe_year,
                energy_cost_min: cd.energy_cost_min,
                energy_cost_max: cd.energy_cost_max,

                // Amenities
                hasElevator: cd.hasElevator ?? false,
                isAccessible: cd.isAccessible ?? false,
                hasFiber: cd.hasFiber ?? false,
                hasBikeRoom: cd.hasBikeRoom ?? false,
                hasPool: cd.hasPool ?? false,
                isNearTransport: cd.isNearTransport ?? false,
                hasDigicode: cd.hasDigicode ?? false,
                hasIntercom: cd.hasIntercom ?? false,
                hasCaretaker: cd.hasCaretaker ?? false,
                isQuietArea: cd.isQuietArea ?? false,
                isNearGreenSpace: cd.isNearGreenSpace ?? false,
                isNearSchools: cd.isNearSchools ?? false,
                isNearShops: cd.isNearShops ?? false,
                isNearHospital: cd.isNearHospital ?? false,

                isTraversant: cd.isTraversant ?? false,
                hasGarden: cd.hasGarden ?? false,
                isRefurbished: cd.isRefurbished ?? false,
                isSouthFacing: cd.isSouthFacing ?? false,
                isBright: cd.isBright ?? false,
                hasNoOpposite: cd.hasNoOpposite ?? false,
                hasView: cd.hasView ?? false,
                isQuiet: cd.isQuiet ?? false,
                hasBathtub: cd.hasBathtub ?? false,
                hasAirConditioning: cd.hasAirConditioning ?? false,

                hasStorage: cd.hasStorage ?? false,
                hasLaundry: cd.hasLaundry ?? false,
                hasArmoredDoor: cd.hasArmoredDoor ?? false,
                hasConcierge: cd.hasConcierge ?? false,
                hasAutomaticDoors: cd.hasAutomaticDoors ?? false,

                hasBalcony: cd.hasBalcony ?? false,
                hasTerrace: cd.hasTerrace ?? false,
                hasLoggia: cd.hasLoggia ?? false,
                hasCourtyard: cd.hasCourtyard ?? false,
                hasShutters: cd.hasShutters ?? false,
                hasCave: cd.hasCave ?? false,
                hasParking: cd.hasParking ?? false,
                hasGarage: cd.hasGarage ?? false,
                propertySubType: cd.propertySubType ?? null,
                isKitchenEquipped: cd.isKitchenEquipped ?? false,
                hasSeparateKitchen: cd.hasSeparateKitchen ?? false,

                transitData: cd.transitData,

                // Pre-aggregated images from cardData
                images: cd.images || [],

                // Minimal rentalUnit stub for type compatibility
                rentalUnit: {
                    id: listing.rentalUnitId,
                    type: cd.rentalUnitType || 'ENTIRE_PLACE',
                    surface: listing.dnSurface,
                    isFurnished: cd.isFurnished ?? false,
                    property: {
                        id: '',
                        ownerId: listing.dnOwnerId,
                        city: listing.dnCity,
                        category: listing.dnCategory,
                        createdAt: owner.createdAt || listing.createdAt.toISOString(),
                        updatedAt: owner.updatedAt || listing.createdAt.toISOString(),
                        owner: {
                            ...owner,
                            createdAt: owner.createdAt || listing.createdAt.toISOString(),
                            updatedAt: owner.updatedAt || listing.createdAt.toISOString(),
                        },
                        images: [],
                        rooms: cd.rooms || [],
                    },
                    images: [],
                },

                rooms: cd.rooms || [],
                user: owner,
            };
        }).filter(Boolean);

        return safeListings;

    } catch (error: any) {
        throw new Error(error);
    }
}
