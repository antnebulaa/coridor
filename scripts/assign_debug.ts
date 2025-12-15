import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const listing = await prisma.listing.findFirst({
        include: {
            rooms: true,
            images: {
                orderBy: {
                    order: 'asc'
                }
            },
        }
    });

    if (!listing) {
        console.log("No listing found");
        return;
    }

    console.log(`Found Listing: ${listing.id} (${listing.title})`);

    let room = listing.rooms[0];
    if (!room) {
        console.log("No rooms found for listing, creating one...");
        room = await prisma.room.create({
            data: {
                name: "Salon Debug",
                listingId: listing.id
            }
        });
        console.log("Created room:", room.name);
    } else {
        console.log(`Using existing room: ${room.name} (${room.id})`);
    }

    if (listing.images.length === 0) {
        console.log("No images found for listing");
        return;
    }

    // Find an unassigned image preferably, or just the first one
    const targetImage = listing.images.find(img => !img.roomId) || listing.images[0];

    console.log(`Assigning Image ${targetImage.id} to Room ${room.id} (${room.name})`);

    await prisma.propertyImage.update({
        where: { id: targetImage.id },
        data: { roomId: room.id }
    });

    console.log("Done!");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
