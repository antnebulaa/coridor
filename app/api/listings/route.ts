import { NextResponse } from "next/server";

import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(
    request: Request,
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const body = await request.json();
    console.log("RECEIVED BODY:", body);
    const {
        title,
        description,
        imageSrc,
        category,
        roomCount,
        bathroomCount,
        guestCount,
        location,
        price,
        leaseType,
        dpe,
        amenities,
        charges,
        rooms,
        // New fields
        isFurnished,
        surface,
        surfaceUnit,
        kitchenType,
        floor,
        totalFloors,
        buildYear
    } = body;

    Object.keys(body).forEach((value: any) => {
        if (!body[value]) {
            NextResponse.error();
        }
    });

    const listing = await prisma.listing.create({
        data: {
            title,
            description,
            category,
            roomCount,
            bathroomCount,
            guestCount,
            locationValue: location.value,
            price: parseInt(price, 10),
            userId: currentUser.id,
            leaseType,
            dpe,
            charges: { amount: parseInt(charges, 10) },
            // New fields
            isFurnished,
            surface: surface ? parseFloat(surface) : null,
            surfaceUnit,
            kitchenType,
            floor: floor ? parseInt(floor, 10) : null,
            totalFloors: totalFloors ? parseInt(totalFloors, 10) : null,
            buildYear: buildYear ? parseInt(buildYear, 10) : null,
            // Amenities
            ...amenities.reduce((acc: any, key: string) => {
                acc[key] = true;
                return acc;
            }, {}),
        }
    });

    // Handle Rooms and Images separately to ensure correct linking
    if (rooms && rooms.length > 0) {
        for (const room of rooms) {
            const createdRoom = await prisma.room.create({
                data: {
                    name: room.name,
                    listingId: listing.id
                }
            });

            if (room.images && room.images.length > 0) {
                await prisma.propertyImage.createMany({
                    data: room.images.map((url: string) => ({
                        url,
                        listingId: listing.id,
                        roomId: createdRoom.id
                    }))
                });
            }
        }
    }

    return NextResponse.json(listing);
}
