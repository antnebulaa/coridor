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

    // Verify ownership
    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId
        }
    });

    if (!listing || listing.userId !== currentUser.id) {
        return NextResponse.error();
    }

    // Check for existing rooms with similar names
    const existingRooms = await prisma.room.findMany({
        where: {
            listingId,
            name: {
                startsWith: name
            }
        }
    });

    let finalName = name;
    if (existingRooms.length > 0) {
        // Filter to find exact matches or matches with " X" suffix
        const regex = new RegExp(`^${name}( \\d+)?$`);
        const matchingRooms = existingRooms.filter(r => regex.test(r.name));

        if (matchingRooms.length > 0) {
            // Find highest number
            let maxNum = 1;
            matchingRooms.forEach(r => {
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
            listingId
        }
    });

    return NextResponse.json(room);
}
