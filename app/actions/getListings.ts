import { Listing } from "@prisma/client";

import prisma from "@/libs/prismadb";

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
            maxSurface
        } = params;

        let query: any = {};

        console.log("GET LISTINGS PARAMS:", params);

        if (userId) {
            query.userId = userId;
        }

        if (category) {
            query.category = category;
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
        }));

        return safeListings;
    } catch (error: any) {
        throw new Error(error);
    }
}
