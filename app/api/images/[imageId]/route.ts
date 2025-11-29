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

    // Verify ownership via listing
    const image = await prisma.propertyImage.findUnique({
        where: {
            id: imageId
        },
        include: {
            listing: true
        }
    });

    if (!image || image.listing.userId !== currentUser.id) {
        return NextResponse.error();
    }

    const updatedImage = await prisma.propertyImage.update({
        where: {
            id: imageId
        },
        data: {
            roomId: roomId // Can be null to unassign
        }
    });

    return NextResponse.json(updatedImage);
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

    // Verify ownership via listing
    const image = await prisma.propertyImage.findUnique({
        where: {
            id: imageId
        },
        include: {
            listing: true
        }
    });

    if (!image || image.listing.userId !== currentUser.id) {
        return NextResponse.error();
    }

    const deletedImage = await prisma.propertyImage.delete({
        where: {
            id: imageId
        }
    });

    return NextResponse.json(deletedImage);
}
