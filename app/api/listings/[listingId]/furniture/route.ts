import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";

interface IParams {
    listingId?: string;
}

export async function POST(
    request: Request,
    { params }: { params: IParams }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== 'string') {
        throw new Error('Invalid ID');
    }

    const body = await request.json();

    // Check ownership
    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId,
            userId: currentUser.id
        }
    });

    if (!listing) {
        return NextResponse.error();
    }

    // Upsert furniture record
    const furniture = await prisma.furniture.upsert({
        where: {
            listingId: listingId,
        },
        update: body,
        create: {
            listingId: listingId,
            ...body
        }
    });

    return NextResponse.json(furniture);
}
