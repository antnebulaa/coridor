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
            sort
        } = params;

        let query: any = {};
        let commuteIds: string[] | null = null;

        // Prepare Commute Points
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
            // Legacy / Single point fallback
            commutePoints = [{
                lat: commuteLatitude,
                lng: commuteLongitude,
                mode: commuteTransportMode,
                time: commuteMaxTime
            }];
        }

        // Commute Filtering Logic
        if (commutePoints.length > 0) {
            console.log(`Processing ${commutePoints.length} commute points...`);

            // To perform intersection, we need to track IDs valid for EACH point.
            // We start with null, and for first point we set it. For subsequent, we intersect.
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

                    // PostGIS Query for this point
                    const rawListings = await prisma.$queryRaw<{ id: string }[]>`
                        SELECT id 
                        FROM "Listing"
                        WHERE "latitude" IS NOT NULL 
                        AND "longitude" IS NOT NULL
                        AND ST_Within(
                            ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326),
                            ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonString}), 4326)
                        )
                    `;
                    currentPointIds = rawListings.map((l) => l.id);
                }

                // Intersection Logic
                const currentSet = new Set(currentPointIds);
                if (validIds === null) {
                    validIds = currentSet;
                } else {
                    // Intersect validIds with currentSet
                    // Explicitly cast validIds to avoid inference issues if any
                    const previousIds: string[] = Array.from(validIds as Set<string>);
                    const intersected: string[] = previousIds.filter((id: string) => currentSet.has(id));
                    validIds = new Set(intersected);
                }

                // Optimization: if validIds becomes empty, we can stop early
                if (validIds && validIds.size === 0) {
                    break;
                }
            }

            if (validIds) {
                commuteIds = Array.from(validIds);
                console.log(`Found ${commuteIds.length} listings verifying ALL commute criteria.`);

                if (commuteIds.length === 0) {
                    query.id = { in: [] }; // Force empty result
                } else {
                    query.id = { in: commuteIds };
                }
            }
        }

        console.log("GET LISTINGS PARAMS:", params);

        if (userId) {
            query.userId = userId;
        } else {
            query.isPublished = true;
        }

        if (category) {
            const categories = category.split(',');
            if (categories.length > 0) {
                query.category = { in: categories };
            }
        }

        if (roomCount) {
            query.roomCount = {
                gte: +roomCount
            }
        }

        if (guestCount) {
            query.guestCount = {
                gte: +guestCount
            }
        }

        if (bathroomCount) {
            query.bathroomCount = {
                gte: +bathroomCount
            }
        }

        if (locationValue) {
            query.locationValue = locationValue;
        }

        if (minPrice && maxPrice) {
            query.price = {
                gte: +minPrice,
                lte: +maxPrice
            }
        }

        if (minSurface && maxSurface) {
            query.surface = {
                gte: +minSurface,
                lte: +maxSurface
            }
        }

        if (params.cities) {
            const cities = params.cities.split(',');
            if (cities.length > 0) {
                query.OR = cities.map((city: string) => ({
                    city: {
                        contains: city,
                        mode: 'insensitive'
                    }
                }));
            }
        } else if (params.city) {
            query.city = {
                contains: params.city,
                mode: 'insensitive'
            }
        }

        // Add ID filter if we have one from commute (and it wasn't empty array set above)
        // If query.id is already set (e.g. empty array), don't overwrite if we want to support multiple ID filters later, 
        // but currently we only use ID filter here.
        if (commuteIds && commuteIds.length > 0) {
            query.id = { in: commuteIds };
        }

        if (startDate && endDate) {
            query.NOT = {
                reservations: {
                    some: {
                        OR: [
                            {
                                endDate: { gte: startDate },
                                startDate: { lte: startDate }
                            },
                            {
                                startDate: { lte: endDate },
                                endDate: { gte: endDate }
                            }
                        ]
                    }
                }
            }
        }

        console.log("FINAL QUERY:", JSON.stringify(query, null, 2));

        let orderBy: any = { createdAt: 'desc' };

        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        const listings = await prisma.listing.findMany({
            where: query,
            include: {
                user: true,
                rooms: true, // Needed for photo badges
                images: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: orderBy
        });

        const safeListings = listings.map((listing: any) => ({
            ...listing,
            createdAt: listing.createdAt.toISOString(),
            statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
            // Pass the polygon to the client via a property on the first listing? 
            // Or ideally getListings should return { listings, meta }. 
            // But current architecture expects array. 
            // We can attach it to the first listing as a hack, or rely on Client Component to fetch polygon separately for display?
            // "You can optimize by fetching polygon client side too for display, but here we do it for filter."
            // Let's rely on fetching it again client side or passing it? 
            // Actually, if we want to save API calls, we could pass it. 
            // But modifying return type might break `Home` component props type.
            // Let's fetch it on Client for display separately for now to keep it simple, 
            // OR -- `HomeClient` receives `listings`. 
            // We might just fetch it on the client side for the visual polygon when the search params change.
            // Yes, user said: "Affichez le polygone...". Client side fetch is fine for visualization.
        }));

        return safeListings;
    } catch (error: any) {
        throw new Error(error);
    }
}
