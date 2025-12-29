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
    console.log("RECEIVED BODY:", body);
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
        amenities,
        charges,
        rooms,
        // New fields
        isFurnished,
        surface,
        surfaceUnit,
        kitchenType,
        floor,
        totalFloors,
        buildYear,
        imageSrcs,
        propertyAdjective,
        propertyId, // Phase 3: Add Unit Context
        targetRoomId, // Phase 4: Link to existing room
        bedroomCount, // Phase 4.1: Explicit bedroom count
        bedType, // New field
        hasPrivateBathroom, // New field
        // Legacy
        imageSrc
    } = body;

    // Validate essential fields
    if (!title || !description || !price || (!location && !propertyId)) {
        return NextResponse.error();
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            let property;

            if (propertyId) {
                // Phase 3: Use Existing Property
                property = await tx.property.findUnique({
                    where: {
                        id: propertyId
                    }
                });

                if (!property || property.ownerId !== currentUser.id) {
                    throw new Error("Unauthorized or Property not found");
                }
            } else {
                // 1. Create Property (The Physical Asset)
                property = await tx.property.create({
                    data: {
                        ownerId: currentUser.id,
                        address: location?.label,
                        city: location?.city,
                        district: location?.district,
                        neighborhood: location?.neighborhood,
                        country: location?.country,
                        zipCode: location?.zipCode,
                        latitude: location?.latlng ? location.latlng[0] : null,
                        longitude: location?.latlng ? location.latlng[1] : null,
                        constructionYear: buildYear ? parseInt(buildYear, 10) : null,
                        category: category,

                        // Energy Performance (Moved from Listing)
                        dpe: dpe,
                        ges: ges,

                        // Amenities (Boolean fields on Property)
                        hasElevator: amenities?.includes('hasElevator') || false,
                        isAccessible: amenities?.includes('isAccessible') || false,
                        hasFiber: amenities?.includes('hasFiber') || false,
                        hasBikeRoom: amenities?.includes('hasBikeRoom') || false,
                        hasPool: amenities?.includes('hasPool') || false,
                        isNearTransport: amenities?.includes('isNearTransport') || false,
                        hasDigicode: amenities?.includes('hasDigicode') || false,
                        hasIntercom: amenities?.includes('hasIntercom') || false,
                        hasCaretaker: amenities?.includes('hasCaretaker') || false,
                        isQuietArea: amenities?.includes('isQuietArea') || false,
                        isNearGreenSpace: amenities?.includes('isNearGreenSpace') || false,
                        isNearSchools: amenities?.includes('isNearSchools') || false,
                        isNearShops: amenities?.includes('isNearShops') || false,
                        isNearHospital: amenities?.includes('isNearHospital') || false,

                        // Physical Attributes (Moved from RentalUnit)
                        floor: floor ? parseInt(floor, 10) : null,
                        totalFloors: totalFloors ? parseInt(totalFloors, 10) : null,
                        isTraversant: amenities?.includes('isTraversant') || false,
                        isSouthFacing: amenities?.includes('isSouthFacing') || false,
                        isBright: amenities?.includes('isBright') || false,
                        hasGarden: amenities?.includes('hasGarden') || false,
                        hasBalcony: amenities?.includes('hasBalcony') || false,
                        hasView: amenities?.includes('hasView') || false,
                        hasAirConditioning: amenities?.includes('hasAirConditioning') || false,
                        hasBathtub: amenities?.includes('hasBathtub') || false,
                        isRefurbished: amenities?.includes('isRefurbished') || false,
                        isQuiet: amenities?.includes('isQuiet') || false,
                        hasNoOpposite: amenities?.includes('hasNoOpposite') || false,

                        // Transit data if any passed
                        transitData: undefined
                    }
                });
            }

            // Fetch target Room name if applicable
            let unitName = propertyId ? "Chambre" : " Logement entier"; // Default name distinction
            if (targetRoomId) {
                const targetRoom = await tx.room.findUnique({
                    where: { id: targetRoomId }
                });
                if (targetRoom) {
                    unitName = targetRoom.name;
                }
            }

            // 2. Create RentalUnit (The Logical Unit)
            const rentalUnit = await tx.rentalUnit.create({
                data: {
                    propertyId: property.id,
                    name: unitName,
                    type: propertyId ? "PRIVATE_ROOM" : "ENTIRE_PLACE", // Contextual type
                    surface: surface ? parseFloat(surface) : null,
                    isFurnished: isFurnished || false,
                    targetRoomId: targetRoomId, // Link to physical room
                    bedType: bedType,
                    hasPrivateBathroom: hasPrivateBathroom
                }
            });

            // 3. Create Listing (The Commercial Offer)
            const listing = await tx.listing.create({
                data: {
                    rentalUnitId: rentalUnit.id,
                    // userId: currentUser.id, // Removed from schema

                    title,
                    description,
                    price: typeof price === 'string' ? parseInt(price, 10) : price,
                    status: "DRAFT",
                    isPublished: false,

                    // category: category, // FIXED: Removed (Moved to Property)

                    roomCount: roomCount ? parseInt(roomCount, 10) : 0,
                    bathroomCount: bathroomCount ? parseInt(bathroomCount, 10) : 0,
                    guestCount: guestCount ? parseInt(guestCount, 10) : 0,

                    // leaseType, // Check if LeaseType enum match? 
                    leaseType: leaseType, // Assuming matched

                    // dpe, // MOVED TO PROPERTY
                    // ges, // MOVED TO PROPERTY
                    charges: { amount: typeof charges === 'string' ? parseInt(charges, 10) : (typeof charges === 'number' ? charges : 0) },
                    securityDeposit: 0,
                    propertyAdjective,

                    // Constraints
                    petsAllowed: amenities?.includes('petsAllowed') || false,
                    isStudentFriendly: amenities?.includes('isStudentFriendly') || false,

                    // locationValue: location ? location.value : 'Unknown', // FIXED: Removed (Moved to Property)
                }
            });

            // 4. Handle Rooms (Linked to Property)
            if (rooms && rooms.length > 0) {
                // Manual rooms provided (e.g. from a detailed form)
                for (const room of rooms) {
                    const createdRoom = await tx.room.create({
                        data: {
                            name: room.name,
                            propertyId: property.id
                        }
                    });

                    if (room.images && room.images.length > 0) {
                        await tx.propertyImage.createMany({
                            data: room.images.map((url: string) => ({
                                url,
                                propertyId: property.id,
                                roomId: createdRoom.id
                            }))
                        });
                    }
                }
            } else if (!propertyId) {
                // Auto-create Standard Rooms + Bedrooms
                const mandatoryRooms = ["Salon", "Cuisine", "Salle de bain"];
                for (const name of mandatoryRooms) {
                    await tx.room.create({
                        data: { name, propertyId: property.id }
                    });
                }

                // Create Bedrooms based on roomCount (which is bedroomCount in our context usually, or we use separate field)
                // Assuming `roomCount` from body refers to bedrooms as per user context usually, or if `bedroomCount` field exists.
                // The body destructuring has `bedroomCount`. Let's use that if available, else roomCount.
                const count = bedroomCount ? (typeof bedroomCount === 'string' ? parseInt(bedroomCount, 10) : bedroomCount) : (roomCount ? parseInt(String(roomCount), 10) : 0);

                for (let i = 1; i <= count; i++) {
                    await tx.room.create({
                        data: {
                            name: `Chambre ${i}`,
                            propertyId: property.id
                        }
                    });
                }
            }

            // 5. Handle Global Images (Linked to RentalUnit by default for Listing images)
            const allImages = imageSrcs || (imageSrc ? [imageSrc] : []);
            if (allImages.length > 0) {
                await tx.propertyImage.createMany({
                    data: allImages.map((url: string, index: number) => ({
                        url,
                        order: index,
                        rentalUnitId: rentalUnit.id // Associate generic images with the Unit
                    }))
                });
            }

            return listing;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("LISTING_POST_ERROR", error);
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
    }
}
