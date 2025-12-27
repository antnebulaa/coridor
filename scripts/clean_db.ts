import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning database...');

    // Delete in order of dependencies (child first)
    // Listing -> RentalUnit -> Room -> Property

    // Also PropertyImage

    try {
        await prisma.propertyImage.deleteMany();
        console.log('Deleted PropertyImages');

        await prisma.listing.deleteMany();
        console.log('Deleted Listings');

        await prisma.rentalUnit.deleteMany();
        console.log('Deleted RentalUnits');

        await prisma.room.deleteMany();
        console.log('Deleted Rooms');

        await prisma.property.deleteMany();
        console.log('Deleted Properties');

        console.log('Database cleaned successfully.');
    } catch (error) {
        console.error('Error cleaning database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
