import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

interface IParams {
    listingId: string;
}

export async function POST(
    request: Request,
    props: { params: Promise<IParams> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = params;
    const body = await request.json();

    console.log("API Request Received:");
    console.log("Params:", params);
    console.log("Body:", JSON.stringify(body, null, 2));

    const { slots, dates, visitDuration } = body;

    if (!listingId || !slots || !dates) {
        return NextResponse.json({ error: "Missing fields", fields: { listingId, slots: !!slots, dates: !!dates } }, { status: 400 });
    }

    // Verify ownership
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
        return NextResponse.json({ error: "Listing not found or unauthorized" }, { status: 404 });
    }

    try {
        console.log("Processing visit slots for listing:", listingId);
        console.log("Dates to update:", dates);
        console.log("New slots count:", slots.length);

        await prisma.$transaction(async (tx: any) => {
            console.log("Starting transaction...");

            // 1. Delete existing slots for the specific dates
            if (dates && dates.length > 0) {
                console.log("Deleting slots for dates:", dates);
                // Convert ISO strings to Date objects for Prisma
                const dateObjects = dates.map((d: string) => new Date(d));

                const deleteResult = await tx.visitSlot.deleteMany({
                    where: {
                        listingId: listingId,
                        date: {
                            in: dateObjects
                        }
                    }
                });
                console.log("Deleted count:", deleteResult.count);
            }

            // 2. Create new slots
            if (slots.length > 0) {
                console.log("Creating new slots...");
                const createResult = await tx.visitSlot.createMany({
                    data: slots.map((slot: any) => ({
                        listingId: listingId,
                        date: new Date(slot.date), // Explicitly convert to Date object
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    }))
                });
                console.log("Created count:", createResult.count);
            }
            // 3. Update visit duration if provided
            if (visitDuration) {
                console.log("Updating visit duration to:", visitDuration);
                await tx.listing.update({
                    where: { id: listingId },
                    data: { visitDuration: parseInt(visitDuration) }
                });
            }
        });

        console.log("Transaction successful");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving visit slots:", error);
        return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
    }
}
