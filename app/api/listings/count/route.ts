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

        const query: any = {
            isPublished: true
        };

        // 1. Direct Listing Fields
        if (roomCount) {
            query.roomCount = { gte: +roomCount };
        }

        if (guestCount) {
            query.guestCount = { gte: +guestCount };
        }

        if (bathroomCount) {
            query.bathroomCount = { gte: +bathroomCount };
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

        // 2. RentalUnit Fields (Surface)
        const rentalUnitQuery: any = {
            isActive: true
        };

        if (minSurface && maxSurface) {
            rentalUnitQuery.surface = {
                gte: +minSurface,
                lte: +maxSurface
            };
        }

        // 3. Property Fields (Location, Category, Owner)
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

        if (locationValue) {
            propertyQuery.country = locationValue;
        }

        if (cities) {
            const citiesList = cities.split(',');
            if (citiesList.length > 0) {
                propertyQuery.OR = citiesList.map((c: string) => ({
                    city: { contains: c, mode: 'insensitive' }
                }));
            }
        } else if (city) {
            propertyQuery.city = { contains: city, mode: 'insensitive' };
        }

        // Combine Queries
        query.rentalUnit = {
            ...rentalUnitQuery,
            property: propertyQuery
        };

        const count = await prisma.listing.count({
            where: query
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("COUNT API ERROR:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
