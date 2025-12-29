import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    listingId?: string;
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { listingId } = await params;

    if (!listingId || typeof listingId !== 'string') {
        throw new Error('Invalid ID');
    }

    // Ownership check via Property (since userId invalid on Listing)
    const listingToCheck = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { rentalUnit: { include: { property: true } } }
    });

    if (!listingToCheck || listingToCheck.rentalUnit.property.ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    const listing = await prisma.listing.deleteMany({
        where: {
            id: listingId
        }
    });

    return NextResponse.json(listing);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { listingId } = await params;

    if (!listingId || typeof listingId !== 'string') {
        throw new Error('Invalid ID');
    }

    const body = await request.json();
    console.log("PUT BODY:", body);

    // Fetch Listing to get relations
    const existingListing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { rentalUnit: { include: { property: true } } }
    });

    if (!existingListing) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Ownership Check
    if (existingListing.rentalUnit.property.ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
        title,
        description,
        category,
        roomCount,
        bathroomCount,
        guestCount,
        location,
        price,
        leaseType,
        dpe,
        ges,
        heatingSystem,
        glazingType,
        amenities,
        charges,
        securityDeposit,
        rooms,
        // New fields
        isFurnished,
        surface,
        surfaceUnit,
        kitchenType,
        floor,
        totalFloors,
        buildYear,
        city,
        country,
        imageSrcs,
        energy_cost_min,
        energy_cost_max,
        dpe_year,
        propertyAdjective,
        addressLine1,
        building,
        apartment,
        zipCode,
        rentalUnitType, // NEW: Expecting 'ENTIRE_PLACE' | 'PRIVATE_ROOM'
        bedType, // NEW
        hasPrivateBathroom, // NEW
    } = body;

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const propertyId = existingListing.rentalUnit.propertyId;
            const rentalUnitId = existingListing.rentalUnitId;

            // 1. Prepare Property Update
            const propertyUpdate: any = {
                category,
                heatingSystem,
                glazingType,
                constructionYear: buildYear ? parseInt(String(buildYear), 10) : undefined,
                address: location?.label,
                city: city || location?.city,
                district: body.district || location?.district,
                neighborhood: body.neighborhood || location?.neighborhood,
                country: country || location?.country,
                zipCode: zipCode || location?.zipCode,
                addressLine1: addressLine1,
                building: building,
                apartment: apartment,
                // DPE
                dpe,
                ges,
                dpe_year: dpe_year ? parseInt(String(dpe_year), 10) : undefined,
                energy_cost_min: energy_cost_min ? parseInt(String(energy_cost_min), 10) : undefined,
                energy_cost_max: energy_cost_max ? parseInt(String(energy_cost_max), 10) : undefined,
            };

            if (location?.latlng) {
                propertyUpdate.latitude = location.latlng[0];
                propertyUpdate.longitude = location.latlng[1];
            }

            // 2. Prepare RentalUnit Update
            const rentalUnitUpdate: any = {
                surface: surface ? parseFloat(String(surface)) : undefined,
                floor: (floor !== undefined && floor !== null) ? parseInt(String(floor), 10) : undefined,
                totalFloors: (totalFloors !== undefined && totalFloors !== null) ? parseInt(String(totalFloors), 10) : undefined,
                isFurnished,
                type: rentalUnitType, // Update type if provided
                bedType,
                hasPrivateBathroom
            };

            // 3. Prepare Listing Update
            const listingUpdate: any = {
                title,
                description,
                price: price ? parseInt(String(price), 10) : undefined,
                roomCount: roomCount ? parseInt(roomCount, 10) : undefined,
                bathroomCount: bathroomCount ? parseInt(bathroomCount, 10) : undefined,
                guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
                leaseType,
                charges: charges ? { amount: parseInt(String(charges), 10) } : undefined,
                securityDeposit: (securityDeposit !== undefined && securityDeposit !== null) ? parseInt(String(securityDeposit), 10) : undefined,
                propertyAdjective
            };

            // 4. Distribute Amenities (Boolean Flags)
            if (amenities && Array.isArray(amenities)) {
                // Property Amenities
                propertyUpdate.hasElevator = amenities.includes('hasElevator');
                propertyUpdate.isAccessible = amenities.includes('isAccessible');
                propertyUpdate.hasFiber = amenities.includes('hasFiber');
                propertyUpdate.hasBikeRoom = amenities.includes('hasBikeRoom');
                propertyUpdate.hasPool = amenities.includes('hasPool');
                propertyUpdate.isNearTransport = amenities.includes('isNearTransport');
                propertyUpdate.hasDigicode = amenities.includes('hasDigicode');
                propertyUpdate.hasIntercom = amenities.includes('hasIntercom');
                propertyUpdate.hasCaretaker = amenities.includes('hasCaretaker');
                propertyUpdate.isQuietArea = amenities.includes('isQuietArea');
                propertyUpdate.isNearGreenSpace = amenities.includes('isNearGreenSpace');
                propertyUpdate.isNearSchools = amenities.includes('isNearSchools');
                propertyUpdate.isNearShops = amenities.includes('isNearShops');
                propertyUpdate.isNearHospital = amenities.includes('isNearHospital');

                // Rental Unit Amenities
                propertyUpdate.isTraversant = amenities.includes('isTraversant');
                propertyUpdate.hasGarden = amenities.includes('hasGarden');
                propertyUpdate.isRefurbished = amenities.includes('isRefurbished');
                propertyUpdate.isSouthFacing = amenities.includes('isSouthFacing');
                propertyUpdate.isBright = amenities.includes('isBright');
                propertyUpdate.hasNoOpposite = amenities.includes('hasNoOpposite');
                propertyUpdate.hasView = amenities.includes('hasView');
                propertyUpdate.isQuiet = amenities.includes('isQuiet');
                propertyUpdate.hasBathtub = amenities.includes('hasBathtub');
                propertyUpdate.hasAirConditioning = amenities.includes('hasAirConditioning');

                // Listing Amenities
                listingUpdate.petsAllowed = amenities.includes('petsAllowed');
                listingUpdate.isStudentFriendly = amenities.includes('isStudentFriendly');
            }

            // Execute Updates
            await tx.property.update({
                where: { id: propertyId },
                data: propertyUpdate
            });

            await tx.rentalUnit.update({
                where: { id: rentalUnitId },
                data: rentalUnitUpdate
            });

            const updatedListing = await tx.listing.update({
                where: { id: listingId },
                data: listingUpdate
            });

            // 5. Handle Images (Assigned to RentalUnit by default for generic)
            // Note: This logic for images mimics the POST but handles overwrite.
            if (imageSrcs && imageSrcs.length > 0) {
                // Delete old PropertyImages linked to this RentalUnit (or listing via relation if we kept it? No, PropertyImage links to keys)
                // Wait, we need to be careful not to delete Room images if we are only updating global images.
                // Ideally frontend sends separate payloads. For now, simplistic replace.

                // If imageSrcs is passed, we replace general unit images.
                // Find images with rentalUnitId = current and roomId = null
                await tx.propertyImage.deleteMany({
                    where: {
                        rentalUnitId: rentalUnitId,
                        roomId: null
                    }
                });

                await tx.propertyImage.createMany({
                    data: imageSrcs.map((url: string, index: number) => ({
                        url,
                        order: index,
                        rentalUnitId: rentalUnitId
                    }))
                });
            }

            // 4.5 Sync Room Entities with Bedroom Count
            // If roomCount is updated, we match the physical "Chambre X" rooms
            if (roomCount !== undefined) {
                const newCount = parseInt(String(roomCount), 10);

                // Fetch existing "Chambre" rooms
                const existingBedrooms = await tx.room.findMany({
                    where: {
                        propertyId: propertyId,
                        name: { startsWith: "Chambre" }
                    },
                    orderBy: { name: 'asc' } // "Chambre 1", "Chambre 2"...
                });

                const currentCount = existingBedrooms.length;

                if (newCount > currentCount) {
                    // Create missing rooms
                    for (let i = currentCount + 1; i <= newCount; i++) {
                        await tx.room.create({
                            data: {
                                name: `Chambre ${i}`,
                                propertyId: propertyId
                            }
                        });
                    }
                } else if (newCount < currentCount) {
                    // Delete excess rooms (from the end)
                    // Sort to ensure we delete highest numbers: Chambre 3, Chambre 2...
                    // Note: lexicographical sort might fail "Chambre 10", but simple numbering 1-9 works. 
                    // Ideally parse number.
                    const sorted = existingBedrooms.sort((a: any, b: any) => {
                        const numA = parseInt(a.name.replace('Chambre ', '')) || 0;
                        const numB = parseInt(b.name.replace('Chambre ', '')) || 0;
                        return numA - numB;
                    });

                    const toDelete = sorted.slice(newCount);

                    for (const room of toDelete) {
                        // Delete images first? Cascade usually handles it but explicit is safer or let DB handle
                        // Prisma cascade handles it if defined. Schema says onDelete: Cascade for property, but room->property.
                        // Images link to room? Yes. 
                        // Check Schema for PropertyImage: room Room? @relation(fields: [roomId], references: [id])
                        // Usually needs explicit delete or set null if not cascading.
                        // Let's rely on explicit unlink/delete logic or standard delete.
                        // Wait, deleting a room should act like DELETE /api/rooms/[id].

                        await tx.room.delete({
                            where: { id: room.id }
                        });
                    }
                }
            }

            return updatedListing;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("PUT Listing Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { listingId } = await params;

    if (!listingId || typeof listingId !== 'string') {
        throw new Error('Invalid ID');
    }

    const body = await request.json();
    const { isPublished } = body;

    // Ownership check via fetch
    const listingToCheck = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { rentalUnit: { include: { property: true } } }
    });

    if (!listingToCheck || listingToCheck.rentalUnit.property.ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    const listing = await prisma.listing.update({
        where: {
            id: listingId
        },
        data: {
            isPublished,
            statusUpdatedAt: new Date(),
            status: isPublished ? 'PUBLISHED' : 'DRAFT'
        }
    });

    return NextResponse.json(listing);
}
