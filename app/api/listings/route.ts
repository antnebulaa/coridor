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
        ges,
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
        buildYear,
        imageSrcs
    } = body;

    // Validate essential fields
    if (!title || !description || !price || !location) {
        return NextResponse.error();
    }

    try {
        const listing = await prisma.listing.create({
            data: {
                title,
                description,
                category,
                roomCount,
                bathroomCount,
                guestCount,
                locationValue: location ? location.value : 'Unknown', // Fallback
                price: typeof price === 'string' ? parseInt(price, 10) : price,
                userId: currentUser.id,
                leaseType,
                dpe,
                ges,
                city: location?.city,
                district: location?.district,
                neighborhood: location?.neighborhood,
                country: location?.country,
                latitude: location?.latlng ? location.latlng[0] : null,
                longitude: location?.latlng ? location.latlng[1] : null,
                charges: { amount: typeof charges === 'string' ? parseInt(charges, 10) : (typeof charges === 'number' ? charges : 0) },
                // New fields
                isFurnished,
                surface: surface ? parseFloat(surface) : null,
                surfaceUnit,
                kitchenType,
                floor: floor ? parseInt(floor, 10) : null,
                totalFloors: totalFloors ? parseInt(totalFloors, 10) : null,
                buildYear: buildYear ? parseInt(buildYear, 10) : null,
                // Amenities
                ...(amenities || []).reduce((acc: any, key: string) => {
                    acc[key] = true;
                    return acc;
                }, {}),
            }
        });

        // Handle Rooms and Images separately to ensure correct linking
        // Handle top-level images (new flow)
        if (imageSrcs && imageSrcs.length > 0) {
            await prisma.propertyImage.createMany({
                data: imageSrcs.map((url: string) => ({
                    url,
                    listingId: listing.id
                }))
            });
        }

        // Handle Rooms and Images separately (legacy/edit flow)
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
    } catch (error) {
        console.error("LISTING_POST_ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
