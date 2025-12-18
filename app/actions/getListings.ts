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
            commuteMaxTime
        } = params;

        let query: any = {};
        let commuteIds: string[] | null = null;
        let isochronePolygon = null;

        // Commute Filtering Logic
        if (commuteLatitude && commuteLongitude && commuteTransportMode && commuteMaxTime) {
            console.log("Fetching Isochrone...");
            const isochrone = await getIsochrone(
                [+commuteLongitude, +commuteLatitude],
                commuteTransportMode,
                +commuteMaxTime
            );

            if (isochrone && isochrone.features && isochrone.features.length > 0) {
                // Get the geometry of the isochrone
                const geometry = isochrone.features[0].geometry;
                isochronePolygon = geometry;

                // Perform Geospatial Query using PostGIS
                // We need to find listings where (longitude, latitude) is WITHIN the polygon
                // Prisma doesn't support PostGIS natively in 'findMany' nicely yet for this specific 'geoWithin' raw logic without extensions or raw query.
                // Best approach: Get IDs of listings within polygon via raw query, then filter main query by these IDs.

                // Construct GeoJSON string for PostGIS
                const geoJsonString = JSON.stringify(geometry);

                // Use ST_GeomFromGeoJSON to interpret the polygon
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

                commuteIds = rawListings.map((l) => l.id);
                console.log(`Found ${commuteIds.length} listings in commute zone.`);

                if (commuteIds.length === 0) {
                    // optimization: if no listings found in zone, return empty immediately or let query handle empty IN clause
                    // but query.OR / AND logic might get complex. Let's just strict filter.
                    query.id = { in: [] };
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
            orderBy: {
                createdAt: 'desc'
            }
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
