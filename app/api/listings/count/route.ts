import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const userId = searchParams.get('userId');
        const roomCount = searchParams.get('roomCount');
        const guestCount = searchParams.get('guestCount');
        const bathroomCount = searchParams.get('bathroomCount');
        const locationValue = searchParams.get('locationValue');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category');
        const city = searchParams.get('city');
        const cities = searchParams.get('cities');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const minSurface = searchParams.get('minSurface');
        const maxSurface = searchParams.get('maxSurface');

        let query: any = {};

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

        if (cities) {
            const citiesList = cities.split(',');
            if (citiesList.length > 0) {
                query.OR = citiesList.map((c: string) => ({
                    city: {
                        contains: c,
                        mode: 'insensitive'
                    }
                }));
            }
        } else if (city) {
            query.city = {
                contains: city,
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

        const count = await prisma.listing.count({
            where: query
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("COUNT API ERROR:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
