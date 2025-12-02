import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.amenity.count();
    console.log(`Total amenities: ${count}`);

    const sample = await prisma.amenity.findMany({
        take: 5,
    });
    console.log('Sample amenities:', sample);

    const typeCounts = await prisma.amenity.groupBy({
        by: ['type'],
        _count: {
            type: true,
        },
    });
    console.log('Counts by type:', typeCounts);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
