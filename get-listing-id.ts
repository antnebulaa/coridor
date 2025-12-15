
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Find a listing that has at least one room
        const listing = await prisma.listing.findFirst({
            where: {
                rooms: {
                    some: {} // Has at least one room
                }
            },
            include: {
                images: true,
                rooms: true
            }
        });

        if (listing) {
            console.log(`LISTING_ID: ${listing.id}`);
            console.log('ROOMS:', JSON.stringify(listing.rooms, null, 2));
            console.log('IMAGES:', JSON.stringify(listing.images, null, 2));
        } else {
            console.log('No listings with rooms found. Trying any listing...');
            const anyListing = await prisma.listing.findFirst({
                include: {
                    images: true,
                    rooms: true
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
