import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(
    request: Request
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const body = await request.json();
    const {
        listingId,
        name
    } = body;

    if (!listingId || !name) {
        return NextResponse.error();
    }

    // Verify ownership via Property
    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId
        },
        include: {
            rentalUnit: {
                include: {
                    property: true
                }
            }
        }
    });

    if (!listing || listing.rentalUnit.property.ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    const propertyId = listing.rentalUnit.propertyId;

    // Check for existing rooms on the PROPERTY with similar names
    const existingRooms = await prisma.room.findMany({
        where: {
            propertyId: propertyId,
            name: {
                startsWith: name
            }
        }
    });

    let finalName = name;
    if (existingRooms.length > 0) {
        // Filter to find exact matches or matches with " X" suffix
        const regex = new RegExp(`^${name}( \\d+)?$`);
        const matchingRooms = existingRooms.filter((r: any) => regex.test(r.name));

        if (matchingRooms.length > 0) {
            // Find highest number
            let maxNum = 1;
            matchingRooms.forEach((r: any) => {
                if (r.name === name) {
                    maxNum = Math.max(maxNum, 1);
                } else {
                    const num = parseInt(r.name.replace(`${name} `, ''));
                    if (!isNaN(num)) {
                        maxNum = Math.max(maxNum, num);
                    }
                }
            });
            finalName = `${name} ${maxNum + 1}`;
        }
    }

    const room = await prisma.room.create({
        data: {
            name: finalName,
            propertyId: propertyId
        }
    });

    return NextResponse.json(room);
}
