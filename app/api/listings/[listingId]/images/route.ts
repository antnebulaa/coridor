import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    listingId?: string;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { listingId } = await params;

    if (!listingId || typeof listingId !== 'string') {
        throw new Error('Invalid ID');
    }

    const body = await request.json();
    const { images, roomId } = body; // Array of URLs

    if (!images || !Array.isArray(images)) {
        return NextResponse.error();
    }

    // Verify ownership via RentalUnit -> Property
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

    const rentalUnitId = listing.rentalUnitId;
    const propertyId = listing.rentalUnit.propertyId;

    // Create PropertyImage records linked to the RentalUnit
    // NOTE: We could also link to Property, but since we are in the context of a Listing (which maps to a Unit), 
    // linking to Unit is safer for separation of concerns.
    const createdImages = await prisma.propertyImage.createMany({
        data: images.map((url: string, index: number) => ({
            url,
            rentalUnitId: rentalUnitId, // Link to Unit
            propertyId: propertyId, // Link to Property as well? Schema allows both. Let's populate PropertyId for easier global queries if needed.
            roomId: roomId || null, // Link to Room if provided
            order: index // Basic ordering, might need refinement
        }))
    });

    return NextResponse.json(createdImages);
}
