import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Setting up PostGIS...');

    // 1. Enable PostGIS extension
    try {
        await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
        console.log('✅ PostGIS extension enabled.');
    } catch (e) {
        console.error('❌ Failed to enable PostGIS:', e);
    }

    // 2. Create Geometry Column (if not exists - though Prisma db push should handle this, 
    // but we might need it for the index creation if db push hasn't run yet)
    // Actually, let's let db push handle the column creation if possible, 
    // but we need to update the data.

    // 3. Update Geometry from Lat/Lon
    console.log('🌍 Updating geometry column from existing data...');
    try {
        const count = await prisma.$executeRawUnsafe(`
      UPDATE "Amenity" 
      SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
        console.log(`✅ Updated ${count} records with geometry.`);
    } catch (e) {
        console.error('❌ Failed to update geometry:', e);
    }

    // 4. Create Spatial Index
    console.log('INDEX Creating spatial index...');
    try {
        await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS amenity_geom_idx ON "Amenity" USING GIST (geom);
    `);
        console.log('✅ Spatial index created.');
    } catch (e) {
        console.error('❌ Failed to create index:', e);
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
