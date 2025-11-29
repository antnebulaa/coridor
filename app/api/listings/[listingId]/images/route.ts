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
    const { images } = body; // Array of URLs

    if (!images || !Array.isArray(images)) {
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

    // Create PropertyImage records
    const createdImages = await prisma.propertyImage.createMany({
        data: images.map((url: string) => ({
            url,
            listingId
        }))
    });

    return NextResponse.json(createdImages);
}
