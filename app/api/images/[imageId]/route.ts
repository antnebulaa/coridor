import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    imageId?: string;
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { imageId } = await params;

    if (!imageId || typeof imageId !== 'string') {
        throw new Error('Invalid ID');
    }

    const body = await request.json();
    const { roomId } = body;

    // Verify ownership via proper relation traversal
    // PropertyImage -> RentalUnit -> Property -> Owner
    const image = await prisma.propertyImage.findUnique({
        where: {
            id: imageId
        },
        include: {
            rentalUnit: {
                include: {
                    property: true
                }
            },
            property: true // Logic might be dual
        }
    });

    if (!image) {
        return NextResponse.error();
    }

    // Check ownership
    let ownerId = null;
    if (image.rentalUnit?.property?.ownerId) {
        ownerId = image.rentalUnit.property.ownerId;
    } else if (image.property?.ownerId) {
        ownerId = image.property.ownerId;
    }

    if (ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    const updatedImage = await prisma.propertyImage.update({
        where: {
            id: imageId
        },
        data: {
            roomId: roomId
        }
    });

    return NextResponse.json(updatedImage);
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    return PUT(request, { params });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { imageId } = await params;

    if (!imageId || typeof imageId !== 'string') {
        throw new Error('Invalid ID');
    }

    // Verify ownership via proper relation traversal
    const image = await prisma.propertyImage.findUnique({
        where: {
            id: imageId
        },
        include: {
            rentalUnit: {
                include: {
                    property: true
                }
            },
            property: true
        }
    });

    if (!image) {
        return NextResponse.error();
    }

    // Check ownership
    let ownerId = null;
    if (image.rentalUnit?.property?.ownerId) {
        ownerId = image.rentalUnit.property.ownerId;
    } else if (image.property?.ownerId) {
        ownerId = image.property.ownerId;
    }

    if (ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    const deletedImage = await prisma.propertyImage.delete({
        where: {
            id: imageId
        }
    });

    return NextResponse.json(deletedImage);
}
