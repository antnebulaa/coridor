
import { PrismaClient, UserMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding dev database...');

    const hashedPassword = await bcrypt.hash('password123', 12);

    // 0. Clean DB
    await prisma.visitSlot.deleteMany({});
    await prisma.visit.deleteMany({});
    await prisma.listing.deleteMany({});
    await prisma.rentalUnit.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. Create Landlord
    const landlord = await prisma.user.create({
        data: {
            name: 'Adrien Landlord',
            email: 'adrien@example.com',
            hashedPassword,
            userMode: UserMode.LANDLORD,
            image: '/images/placeholder.jpg'
        }
    });

    console.log('Created Landlord:', landlord.email);

    // 2. Create Property A (Paris)
    const propertyA = await prisma.property.create({
        data: {
            ownerId: landlord.id,
            category: 'Appartement',
            address: '10 Rue de Rivoli, Paris',
            city: 'Paris',
            latitude: 48.8556,
            longitude: 2.3470,
            totalSurface: 45
        }
    });

    // 3. Create Unit & Listing A1
    const unitA1 = await prisma.rentalUnit.create({
        data: {
            propertyId: propertyA.id,
            name: 'Appartement Entier',
            type: 'ENTIRE_PLACE',
            surface: 45
        }
    });

    const listingA1 = await prisma.listing.create({
        data: {
            rentalUnitId: unitA1.id,
            title: 'Superbe T2 Rivoli',
            description: 'Vue magnifique',
            price: 1200,
            roomCount: 2,
            guestCount: 2,
            bathroomCount: 1,
            status: 'PUBLISHED',
            isPublished: true
        }
    });

    // 4. Create Property A2 (Same Building, Different Apartment)
    // This tests that separate properties at the same location share slots.
    const propertyA2 = await prisma.property.create({
        data: {
            ownerId: landlord.id,
            category: 'Appartement',
            address: '10 Rue de Rivoli, Paris', // Same address as A
            city: 'Paris',
            latitude: 48.8556, // Same coords as A
            longitude: 2.3470,
            totalSurface: 30
        }
    });

    const unitA2 = await prisma.rentalUnit.create({
        data: {
            propertyId: propertyA2.id,
            name: 'Studio Indépendant',
            type: 'ENTIRE_PLACE',
            surface: 30
        }
    });

    const listingA2 = await prisma.listing.create({
        data: {
            rentalUnitId: unitA2.id,
            title: 'Studio Indépendant (2ème étage)',
            description: 'Un autre appartement dans le même immeuble',
            price: 800,
            roomCount: 1,
            guestCount: 2,
            bathroomCount: 1,
            status: 'PUBLISHED',
            isPublished: true
        }
    });

    console.log('Created Listing A2 (Same Location as A1):', listingA2.title);

    // 5. Create Property B (Lyon)
    const propertyB = await prisma.property.create({
        data: {
            ownerId: landlord.id,
            category: 'Maison',
            address: 'Place Bellecour, Lyon',
            city: 'Lyon',
            latitude: 45.7578,
            longitude: 4.8320,
            totalSurface: 100
        }
    });

    const unitB1 = await prisma.rentalUnit.create({
        data: {
            propertyId: propertyB.id,
            name: 'Maison Entière',
            type: 'ENTIRE_PLACE',
            surface: 100
        }
    });

    const listingB1 = await prisma.listing.create({
        data: {
            rentalUnitId: unitB1.id,
            title: 'Belle Maison Lyon',
            description: 'Au cœur de la presqu\'île',
            price: 1800,
            roomCount: 4,
            guestCount: 5,
            bathroomCount: 2,
            status: 'PUBLISHED',
            isPublished: true
        }
    });

    console.log('Created Listing B (Different Location):', listingB1.title);


    // 6. Create Visit Slot (User Centric) at Paris location
    console.log('Creating Shared Slot for Paris listings...');
    await prisma.visitSlot.create({
        data: {
            userId: landlord.id,
            date: new Date(), // Today
            startTime: '10:00',
            endTime: '12:00',
            latitude: 48.8556, // Rivoli (Same as A1 and A2)
            longitude: 2.3470,
            address: '10 Rue de Rivoli, Paris',
            radius: 200
        }
    });
    console.log('Created Visit Slot at Paris location (Should appear on A1 and A2, NOT B).');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
