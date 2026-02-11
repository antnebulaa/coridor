
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function DELETE(
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
        // Find existing to know what to delete (RentalUnit?)
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: { rentalUnit: true }
        });

        if (!listing) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // We delete the RentalUnit which cascades to Listing?
        // Schema: Listing has relation to RentalUnit, onDelete: Cascade?
        // No, Listing `rentalUnit RentalUnit @relation(fields: [rentalUnitId], references: [id], onDelete: Cascade)`
        // So deleting RentalUnit deletes Listing.
        // But if we just want to delete the Listing (commercial offer) and keep the Unit?
        // Usually simpler to delete just the listing if possible.
        // But RentalUnit is often created FOR the listing in this model.
        // If it's a dedicated unit (ENTIRE_PLACE), maybe delete both.
        // If it's a PRIVATE_ROOM in a shared property, delete the unit.

        // Let's delete the Listing first. 
        // Wait, if we delete Listing, RentalUnit remains orphaned?
        // Yes.

        // For clean up:
        // If RentalUnit has NO other listings (which is 99% case), delete RentalUnit too?
        // Let's stick to deleting the Listing for now.

        await prisma.listing.delete({
            where: {
                id: listingId
            }
        });

        return NextResponse.json(listing);
    } catch (error) {
        console.error("DELETE LISTING ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    props: { params: Promise<{ listingId: string }> }
) {
    const params = await props.params;
    // Handle Archive via POST
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = params;

    if (request.url.endsWith('/archive')) {
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

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
