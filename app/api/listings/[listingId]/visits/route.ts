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
    // Verify ownership and get propertyId
    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId,
            rentalUnit: {
                property: {
                    ownerId: currentUser.id
                }
            }
        },
        include: {
            rentalUnit: {
                include: {
                    property: true // Get property for coordinates
                }
            }
        }
    });

    if (!listing) {
        return NextResponse.json({ error: "Listing not found or unauthorized" }, { status: 404 });
    }

    const property = listing.rentalUnit.property;

    try {
        console.log("Processing visit slots for listing:", listingId);
        console.log("User ID:", currentUser.id);
        console.log("Location:", property.address, property.latitude, property.longitude);
        console.log("Dates to update:", dates);
        console.log("New slots count:", slots.length);

        await prisma.$transaction(async (tx: any) => {
            console.log("Starting transaction...");

            // 1. Delete existing slots for the specific dates AND location
            // We only remove slots that are tied to THIS property's location
            if (dates && dates.length > 0) {
                console.log("Deleting slots for dates:", dates);
                // Convert ISO strings to Date objects for Prisma
                const dateObjects = dates.map((d: string) => new Date(d));

                const deleteResult = await tx.visitSlot.deleteMany({
                    where: {
                        userId: currentUser.id, // User owned
                        latitude: property.latitude, // Exact location match
                        longitude: property.longitude,
                        date: {
                            in: dateObjects
                        }
                    }
                });
                console.log("Deleted count:", deleteResult.count);
            }

            // 2. Create new slots linked to User and Location
            if (slots.length > 0) {
                console.log("Creating new slots...");
                const createResult = await tx.visitSlot.createMany({
                    data: slots.map((slot: any) => ({
                        userId: currentUser.id,
                        date: new Date(slot.date), // Explicitly convert to Date object
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        latitude: property.latitude || 0,
                        longitude: property.longitude || 0,
                        address: property.address || `${property.addressLine1}, ${property.city}`,
                        radius: 200 // Default radius
                    }))
                });
                console.log("Created count:", createResult.count);
            }

            // 3. Update visit duration - REMOVED: Field does not exist on Listing model
            /*
            if (visitDuration) {
                console.log("Updating visit duration to:", visitDuration);
                await tx.listing.update({
                    where: { id: listingId },
                    data: { visitDuration: parseInt(visitDuration) }
                });
            }
            */
        });

        console.log("Transaction successful");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving visit slots:", error);
        return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
    }
}
