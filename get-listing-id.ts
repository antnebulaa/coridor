
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Find a listing that has at least one room
        const listing = await prisma.listing.findFirst({
            where: {
                rentalUnit: {
                    property: {
                        rooms: {
                            some: {} // Has at least one room
                        }
                    }
                }
            },
            include: {
                // images: true,
                rentalUnit: {
                    include: {
                        property: {
                            include: {
                                rooms: true,
                                images: true
                            }
                        }
                    }
                }
            }
        });

        if (listing) {
            console.log(`LISTING_ID: ${listing.id}`);
            console.log('ROOMS:', JSON.stringify(listing.rentalUnit.property.rooms, null, 2));
            console.log('IMAGES:', JSON.stringify(listing.rentalUnit.property.images, null, 2));
        } else {
            console.log('No listings with rooms found. Trying any listing...');
            const anyListing = await prisma.listing.findFirst({
                include: {
                    // images: true, // Listing doesn't have images directly anymore usually, accessed via unit/property
                    rentalUnit: {
                        include: {
                            property: {
                                include: {
                                    rooms: true,
                                    images: true
                                }
                            }
                        }
                    }
                }
            });
            if (anyListing) {
                console.log(`LISTING_ID: ${anyListing.id} (No rooms)`);
            } else {
                console.log('No listings found at all.');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
