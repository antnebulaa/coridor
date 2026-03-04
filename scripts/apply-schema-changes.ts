/**
 * Apply denormalized schema changes to Listing table via raw SQL.
 * Adds columns one at a time outside transactions to avoid Supabase timeout.
 *
 * Usage: npx ts-node scripts/apply-schema-changes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runSQL(sql: string, label: string) {
    console.log(`  ${label}...`);
    const start = Date.now();
    try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`  ${label} ✓ (${Date.now() - start}ms)`);
    } catch (err: any) {
        if (err.message?.includes('already exists') || err.meta?.message?.includes('already exists')) {
            console.log(`  ${label} ✓ (already exists)`);
        } else {
            throw err;
        }
    }
}

async function main() {
    // First, check current columns on Listing
    const cols = await prisma.$queryRaw<{column_name: string}[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Listing' AND column_name LIKE 'dn%' OR column_name = 'cardData'
        ORDER BY column_name
    `;
    console.log('Existing denormalized columns:', cols.map((c: any) => c.column_name));

    console.log('\nAdding columns (one at a time)...');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnCity" TEXT`, 'dnCity');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnZipCode" TEXT`, 'dnZipCode');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnLatitude" DOUBLE PRECISION`, 'dnLatitude');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnLongitude" DOUBLE PRECISION`, 'dnLongitude');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnCategory" TEXT`, 'dnCategory');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnOwnerId" TEXT`, 'dnOwnerId');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dnSurface" DOUBLE PRECISION`, 'dnSurface');
    await runSQL(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "cardData" JSONB`, 'cardData');

    console.log('\nCreating indexes...');
    await runSQL(`CREATE INDEX IF NOT EXISTS "Listing_dnCity_idx" ON "Listing"("dnCity")`, 'idx:dnCity');
    await runSQL(`CREATE INDEX IF NOT EXISTS "Listing_dnCategory_idx" ON "Listing"("dnCategory")`, 'idx:dnCategory');
    await runSQL(`CREATE INDEX IF NOT EXISTS "Listing_dnOwnerId_idx" ON "Listing"("dnOwnerId")`, 'idx:dnOwnerId');
    await runSQL(`CREATE INDEX IF NOT EXISTS "Listing_isPublished_status_idx" ON "Listing"("isPublished", "status")`, 'idx:isPublished+status');

    // Verify
    const finalCols = await prisma.$queryRaw<{column_name: string}[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Listing' AND (column_name LIKE 'dn%' OR column_name = 'cardData')
        ORDER BY column_name
    `;
    console.log('\nFinal columns:', finalCols.map((c: any) => c.column_name));
    console.log('\nDone!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
