import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

interface IParams {
    wishlistId?: string;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();
    const { wishlistId } = await params;

    if (!currentUser) {
        return NextResponse.error();
    }

    const body = await request.json();
    const { listingId } = body;

    if (!wishlistId || !listingId) {
        return NextResponse.error();
    }

    const wishlist = await prisma.wishlist.findUnique({
        where: {
            id: wishlistId,
            userId: currentUser.id
        }
    });

    if (!wishlist) {
        return NextResponse.error();
    }

    const updatedWishlist = await prisma.wishlist.update({
        where: {
            id: wishlistId
        },
        data: {
            listings: {
                connect: { id: listingId }
            }
        }
    });

    return NextResponse.json(updatedWishlist);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();
    const { wishlistId } = await params;

    if (!currentUser) {
        return NextResponse.error();
    }

    if (!wishlistId) {
        return NextResponse.error();
    }

    // Try to parse body to see if we are removing a listing or deleting the wishlist
    let listingId;
    try {
        const body = await request.json();
        listingId = body?.listingId;
    } catch (error) {
        // Body is likely empty, meaning we want to delete the wishlist itself
    }

    if (listingId) {
        // Remove listing from wishlist
        const wishlist = await prisma.wishlist.findUnique({
            where: {
                id: wishlistId,
                userId: currentUser.id
            }
        });

        if (!wishlist) {
            return NextResponse.error();
        }

        const updatedWishlist = await prisma.wishlist.update({
            where: {
                id: wishlistId
            },
            data: {
                listings: {
                    disconnect: { id: listingId }
                }
            }
        });

        return NextResponse.json(updatedWishlist);
    } else {
        // Delete the entire wishlist
        const deletedWishlist = await prisma.wishlist.delete({
            where: {
                id: wishlistId,
                userId: currentUser.id
            }
        });

        return NextResponse.json(deletedWishlist);
    }
}
