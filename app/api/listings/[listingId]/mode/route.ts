
import { NextResponse } from "next/server";
import { RentalUnitType } from "@prisma/client";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import fs from 'fs';
import path from 'path';

export async function POST(
    request: Request,
    props: { params: Promise<{ listingId: string }> }
) {
    let params;
    try {
        params = await props.params;
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.error();
        }

        const { listingId } = params;
        const body = await request.json();
        const { mode } = body; // 'COLOCATION' or 'STANDARD'

        if (!listingId || !mode) {
            return NextResponse.json({ error: "Missing listingId or mode" }, { status: 400 });
        }

        // Fetch the listing and its context
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                rentalUnits: {
                                    include: {
                                        listings: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!listing || !listing.rentalUnit || !listing.rentalUnit.property) {
            return NextResponse.json({ error: "Listing or Property not found" }, { status: 404 });
        }

        const property = listing.rentalUnit.property;
        const propertyRentalUnits = property.rentalUnits;

        // Identify types
        const mainUnit = propertyRentalUnits.find((u: any) => u.type === RentalUnitType.ENTIRE_PLACE);
        const roomUnits = propertyRentalUnits.filter((u: any) => u.type === RentalUnitType.PRIVATE_ROOM);

        let targetListingId = listingId; // Default to current, update if we switch context

        // LOGIC
        if (mode === 'COLOCATION') {
            // 1. Archive Main Unit
            if (mainUnit) {
                await prisma.rentalUnit.update({
                    where: { id: mainUnit.id },
                    data: { isActive: false }
                });
            }

            // 2. Wake up Rooms OR Create First Room
            if (roomUnits.length > 0) {
                // Wake up all existing rooms
                await prisma.rentalUnit.updateMany({
                    where: {
                        propertyId: property.id,
                        type: RentalUnitType.PRIVATE_ROOM
                    },
                    data: { isActive: true }
                });

                // If we were on Main Unit, redirect to first room
                if (listing.rentalUnit.type === RentalUnitType.ENTIRE_PLACE) {
                    const firstRoom = roomUnits[0];
                    if (firstRoom.listings && firstRoom.listings.length > 0) {
                        targetListingId = firstRoom.listings[0].id;
                    }
                }
            } else {
                // Create First Room
                const newUnit = await prisma.rentalUnit.create({
                    data: {
                        name: "Chambre 1",
                        type: RentalUnitType.PRIVATE_ROOM,
                        propertyId: property.id,
                        isActive: true,
                    }
                });

                // Create Listing for this room
                const newListing = await prisma.listing.create({
                    data: {
                        title: "Chambre 1",
                        description: "Chambre en colocation",
                        rentalUnitId: newUnit.id,
                        price: 0,
                        status: "DRAFT",
                        isPublished: false
                    }
                });
                targetListingId = newListing.id;
            }
        } else {
            // STANDARD MODE ("Logement Entier")

            let activeMainUnitId = mainUnit?.id;

            if (mainUnit) {
                await prisma.rentalUnit.update({
                    where: { id: mainUnit.id },
                    data: { isActive: true }
                });

                // Check if main unit has listing
                if (mainUnit.listings && mainUnit.listings.length > 0) {
                    targetListingId = mainUnit.listings[0].id;
                } else {
                    // Create listing for existing main unit if missing
                    const newListing = await prisma.listing.create({
                        data: {
                            title: property.address || "Appartement",
                            description: "Logement entier",
                            rentalUnitId: mainUnit.id,
                            price: 0,
                            status: "DRAFT",
                            isPublished: false
                        }
                    });
                    targetListingId = newListing.id;
                }
            } else {
                // CREATE Main Unit
                const newMainUnit = await prisma.rentalUnit.create({
                    data: {
                        name: "Logement entier",
                        type: RentalUnitType.ENTIRE_PLACE,
                        propertyId: property.id,
                        isActive: true,
                    }
                });

                const newListing = await prisma.listing.create({
                    data: {
                        title: property.address || "Appartement",
                        description: "Logement entier",
                        rentalUnitId: newMainUnit.id,
                        price: 0,
                        status: "DRAFT",
                        isPublished: false
                    }
                });
                targetListingId = newListing.id;
                activeMainUnitId = newMainUnit.id;
            }

            // 2. Archive All Rooms
            await prisma.rentalUnit.updateMany({
                where: {
                    propertyId: property.id,
                    type: RentalUnitType.PRIVATE_ROOM
                },
                data: { isActive: false }
            });
        }

        return NextResponse.json({ success: true, targetListingId });
    } catch (error: any) {
        const logPath = path.join(process.cwd(), 'debug_error.log');
        const errorMessage = `[${new Date().toISOString()}] ERROR: ${error?.message}\nSTACK: ${error?.stack}\nPARAMS: ${JSON.stringify(params)}\n\n`;
        try { fs.appendFileSync(logPath, errorMessage); } catch (e) { console.error("Failed to write log", e); }
        console.error("API Error Logged to", logPath, error);
        return NextResponse.json({ error: error?.message, details: "Check debug_error.log" }, { status: 500 });
    }
}
