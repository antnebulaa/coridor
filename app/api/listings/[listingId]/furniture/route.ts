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
    const { listingId } = await params;

    if (!currentUser) {
        return NextResponse.error();
    }



    if (!listingId || typeof listingId !== 'string') {
        throw new Error('Invalid ID');
    }

    const body = await request.json();

    // Check ownership
    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId,
            rentalUnit: {
                property: {
                    ownerId: currentUser.id
                }
            }
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
