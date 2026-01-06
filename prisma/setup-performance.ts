import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Optimizing Database Performance...');

    try {
        // 1. Ensure PostGIS is definitely there (idempotent)
        await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
        console.log('✅ PostGIS extension confirmed.');

        // 2. Create Functional Index on Property (longitude, latitude)
        // This is crucial for ST_Within queries in getListings
        console.log('Creating spatial index on Property table...');
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS property_location_idx 
            ON "Property" 
            USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
        `);
        console.log('✅ property_location_idx created successfully.');

    } catch (e) {
        console.error('❌ Optimization failed:', e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
