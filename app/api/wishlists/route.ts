import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(
    request: Request,
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const body = await request.json();
    const {
        name,
        listingId
    } = body;

    const wishlist = await prisma.wishlist.create({
        data: {
            name,
            userId: currentUser.id,
            listings: listingId ? {
                connect: { id: listingId }
            } : undefined
        }
    });

    return NextResponse.json(wishlist);
}

export async function GET(
    request: Request,
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const wishlists = await prisma.wishlist.findMany({
        where: {
            userId: currentUser.id
        },
        include: {
            listings: {
                take: 1,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    images: true
                }
            },
            _count: {
                select: { listings: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return NextResponse.json(wishlists);
}

