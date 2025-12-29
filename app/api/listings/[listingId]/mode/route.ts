
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

            // 2. SYNC: Fetch Physical Rooms (Albumns)
            const physicalBedrooms = await prisma.room.findMany({
                where: {
                    propertyId: property.id,
                    name: { startsWith: "Chambre" }
                },
                orderBy: { name: 'asc' }
            });

            if (physicalBedrooms.length === 0) {
                // Should not happen if created correctly, but fallback: create 1
                const newRoom = await prisma.room.create({
                    data: { name: "Chambre 1", propertyId: property.id }
                });
                physicalBedrooms.push(newRoom);
            }

            // 3. Ensure RentalUnit exists for each Room
            for (const room of physicalBedrooms) {
                // Check if unit exists linked to this targetRoomId
                let unit = await prisma.rentalUnit.findFirst({
                    where: {
                        propertyId: property.id,
                        targetRoomId: room.id
                    }
                });

                if (unit) {
                    // Activate if exists
                    await prisma.rentalUnit.update({
                        where: { id: unit.id },
                        data: { isActive: true }
                    });
                } else {
                    // Create new Unit linked to Room
                    unit = await prisma.rentalUnit.create({
                        data: {
                            name: room.name,
                            type: RentalUnitType.PRIVATE_ROOM,
                            propertyId: property.id,
                            isActive: true,
                            targetRoomId: room.id, // Strictly link logic
                        }
                    });

                    // Create Listing generic for this unit
                    await prisma.listing.create({
                        data: {
                            title: room.name,
                            description: "Chambre en colocation",
                            rentalUnitId: unit.id,
                            price: 0,
                            status: "DRAFT",
                            isPublished: false
                        }
                    });
                }

                // Set focus to the first one found/created
                if (targetListingId === listingId) {
                    const firstListing = await prisma.listing.findFirst({
                        where: { rentalUnitId: unit.id }
                    });
                    if (firstListing) targetListingId = firstListing.id;
                }
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
