
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(
    request: Request,
    props: { params: Promise<{ listingId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = params;

    try {
        const listing = await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: 'ARCHIVED',
                isPublished: false
            }
        });
        return NextResponse.json(listing);
    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
