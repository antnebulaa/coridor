import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    roomId?: string;
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { roomId } = await params;

    if (!roomId || typeof roomId !== 'string') {
        throw new Error('Invalid ID');
    }

    // Verify ownership via listing
    const room = await prisma.room.findUnique({
        where: {
            id: roomId
        },
        include: {
            listing: true
        }
    });

    if (!room || room.listing.userId !== currentUser.id) {
        return NextResponse.error();
    }

    // Unassign images first
    await prisma.propertyImage.updateMany({
        where: {
            roomId: roomId
        },
        data: {
            roomId: null
        }
    });

    // Delete room
    const deletedRoom = await prisma.room.delete({
        where: {
            id: roomId
        }
    });

    return NextResponse.json(deletedRoom);
}
