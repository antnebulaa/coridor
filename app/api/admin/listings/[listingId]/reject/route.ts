
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { syncListingCardData } from '@/lib/syncListingCardData';

export async function POST(
    request: Request,
    props: { params: Promise<{ listingId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    try {
        const listing = await prisma.listing.update({
            where: {
                id: params.listingId,
            },
            data: {
                status: 'REJECTED',
                isPublished: false,
                reviewedAt: new Date(),
                reviewedBy: currentUser.id,
                rejectionReason: reason
            }
        });

        // Sync denormalized card data (status changed)
        syncListingCardData(params.listingId).catch(console.error);

        return NextResponse.json(listing);
    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
