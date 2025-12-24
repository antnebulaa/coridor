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

    const listing = await prisma.listing.deleteMany({
        where: {
            id: listingId,
            userId: currentUser.id
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
    console.log("Listing ID:", listingId);
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
        heatingSystem, // NEW
        glazingType, // NEW
        amenities,
        charges,
        securityDeposit, // NEW
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
        propertyAdjective, // NEW
        addressLine1,
        building,
        apartment,
        zipCode
    } = body;

    try {
        // Transaction to ensure atomicity
        const listing = await prisma.$transaction(async (tx) => {
            // 1. Update basic listing info
            const updateData: any = {
                title,
                description,
                category,
                roomCount,
                bathroomCount,
                guestCount,
                locationValue: location?.value,
                price: price ? parseInt(String(price), 10) : undefined,
                leaseType,
                dpe,
                ges,
                heatingSystem,
                glazingType,
                charges: charges ? { amount: parseInt(String(charges), 10) } : undefined,
                securityDeposit: (securityDeposit !== undefined && securityDeposit !== null) ? parseInt(String(securityDeposit), 10) : undefined,
                // New fields
                isFurnished,
                surface: surface ? parseFloat(String(surface)) : undefined,
                surfaceUnit,
                kitchenType,
                floor: (floor !== undefined && floor !== null) ? parseInt(String(floor), 10) : undefined,
                totalFloors: (totalFloors !== undefined && totalFloors !== null) ? parseInt(String(totalFloors), 10) : undefined,
                buildYear: buildYear ? parseInt(String(buildYear), 10) : undefined,
                propertyAdjective, // NEW
                // DPE Energy Costs
                energy_cost_min: energy_cost_min ? parseInt(String(energy_cost_min), 10) : null,
                energy_cost_max: energy_cost_max ? parseInt(String(energy_cost_max), 10) : null,
                dpe_year: dpe_year ? parseInt(String(dpe_year), 10) : null,
                addressLine1: addressLine1 || (location ? (location.street || (location.label?.split(',')[0].trim())) : undefined),
                building: building,
                apartment: apartment,
                zipCode: zipCode || location?.zipCode,
                city: city || location?.city,
                district: body.district || location?.district,
                neighborhood: body.neighborhood || location?.neighborhood,
                country: country || location?.country,
                latitude: location?.latlng ? location.latlng[0] : undefined,
                longitude: location?.latlng ? location.latlng[1] : undefined,
            };

            // Handle amenities only if provided
            if (amenities && Array.isArray(amenities)) {
                updateData.isTraversant = amenities.includes('isTraversant');
                updateData.hasGarden = amenities.includes('hasGarden');
                updateData.isRefurbished = amenities.includes('isRefurbished');
                updateData.petsAllowed = amenities.includes('petsAllowed');
                updateData.isKitchenEquipped = amenities.includes('isKitchenEquipped');
                updateData.isSouthFacing = amenities.includes('isSouthFacing');
                updateData.hasStorage = amenities.includes('hasStorage');
                updateData.hasFiber = amenities.includes('hasFiber');
                updateData.hasBikeRoom = amenities.includes('hasBikeRoom');
                updateData.hasLaundry = amenities.includes('hasLaundry');
                updateData.isNearTransport = amenities.includes('isNearTransport');
                updateData.hasDigicode = amenities.includes('hasDigicode');
                updateData.hasIntercom = amenities.includes('hasIntercom');
                updateData.hasCaretaker = amenities.includes('hasCaretaker');
                updateData.hasArmoredDoor = amenities.includes('hasArmoredDoor');
                updateData.isQuietArea = amenities.includes('isQuietArea');
                updateData.isNearGreenSpace = amenities.includes('isNearGreenSpace');
                updateData.isNearSchools = amenities.includes('isNearSchools');
                updateData.isNearShops = amenities.includes('isNearShops');
                updateData.isNearHospital = amenities.includes('isNearHospital');

                // New Amenities
                updateData.hasElevator = amenities.includes('hasElevator');
                updateData.isAccessible = amenities.includes('isAccessible');
                updateData.hasAutomaticDoors = amenities.includes('hasAutomaticDoors');
                updateData.isLastFloor = amenities.includes('isLastFloor');
                updateData.isBright = amenities.includes('isBright');
                updateData.hasNoOpposite = amenities.includes('hasNoOpposite');
                updateData.hasView = amenities.includes('hasView');
                updateData.isQuiet = amenities.includes('isQuiet');
                updateData.hasPool = amenities.includes('hasPool');
                updateData.hasBathtub = amenities.includes('hasBathtub');
                updateData.hasAirConditioning = amenities.includes('hasAirConditioning');
                updateData.isStudentFriendly = amenities.includes('isStudentFriendly');
                updateData.hasConcierge = amenities.includes('hasConcierge');
            }

            const updatedListing = await tx.listing.update({
                where: {
                    id: listingId,
                    userId: currentUser.id
                },
                data: updateData
            });

            // 2. Manage images (both flows)
            if (rooms || imageSrcs) {
                // Delete existing rooms and images
                await tx.room.deleteMany({
                    where: {
                        listingId: listingId
                    }
                });

                await tx.propertyImage.deleteMany({
                    where: {
                        listingId: listingId
                    }
                });

                // Handle top-level images (new flow)
                if (imageSrcs && imageSrcs.length > 0) {
                    await tx.propertyImage.createMany({
                        data: imageSrcs.map((url: string) => ({
                            url,
                            listingId: listingId
                        }))
                    });
                }

                // Handle Rooms and Images (legacy/edit flow)
                if (rooms && rooms.length > 0) {
                    for (const room of rooms) {
                        const createdRoom = await tx.room.create({
                            data: {
                                name: room.name,
                                listingId: listingId
                            }
                        });

                        if (room.images && room.images.length > 0) {
                            await tx.propertyImage.createMany({
                                data: room.images.map((url: string) => ({
                                    url,
                                    listingId: listingId,
                                    roomId: createdRoom.id
                                }))
                            });
                        }
                    }
                }
            }

            return updatedListing;
        });

        return NextResponse.json(listing);
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

    const listing = await prisma.listing.update({
        where: {
            id: listingId,
            userId: currentUser.id
        },
        data: {
            isPublished,
            statusUpdatedAt: new Date()
        }
    });

    return NextResponse.json(listing);
}
