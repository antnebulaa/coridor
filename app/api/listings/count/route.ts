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

        // Advanced filters via cardData JSONB
        const furnished = searchParams.get('furnished');
        const propertyTypes = searchParams.get('propertyTypes');
        const floorTypes = searchParams.get('floorTypes');
        const dpeMin = searchParams.get('dpeMin');
        const dpeMax = searchParams.get('dpeMax');
        const amenitiesParam = searchParams.get('amenities');
        const heatingTypesParam = searchParams.get('heatingTypes');

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
            if (typeConditions.length > 0) cardDataConditions.push({ OR: typeConditions });
        }

        if (floorTypes) {
            const floors = floorTypes.split(',');
            const floorConditions: any[] = [];
            for (const f of floors) {
                if (f === 'rdc') floorConditions.push({ cardData: { path: ['floor'], equals: 0 } });
                if (f === 'lastFloor') floorConditions.push({ cardData: { path: ['isLastFloor'], equals: true } });
                if (f === 'highFloor') floorConditions.push({ cardData: { path: ['floor'], gte: 4 } });
            }
            if (floorConditions.length > 0) cardDataConditions.push({ OR: floorConditions });
        }

        if (dpeMin || dpeMax) {
            const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
            const minIdx = dpeMin ? grades.indexOf(dpeMin) : 0;
            const maxIdx = dpeMax ? grades.indexOf(dpeMax) : (dpeMin ? grades.indexOf(dpeMin) : 6);
            const validGrades = grades.slice(minIdx, maxIdx + 1);
            if (validGrades.length < 7) {
                cardDataConditions.push({ OR: validGrades.map(g => ({ cardData: { path: ['dpe'], equals: g } })) });
            }
        }

        if (amenitiesParam) {
            for (const a of amenitiesParam.split(',')) {
                cardDataConditions.push({ cardData: { path: [a], equals: true } });
            }
        }

        if (heatingTypesParam) {
            const htypes = heatingTypesParam.split(',');
            cardDataConditions.push({ OR: htypes.map(h => ({ cardData: { path: ['heatingSystem'], equals: h } })) });
        }

        // Combine Queries
        query.rentalUnit = {
            ...rentalUnitQuery,
            property: propertyQuery
        };

        if (cardDataConditions.length > 0) {
            if (!query.AND) query.AND = [];
            query.AND.push(...cardDataConditions);
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
