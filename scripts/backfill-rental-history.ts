/**
 * Backfill script: RentalHistory for existing signed leases
 *
 * This script finds all signed RentalApplications (leaseStatus = SIGNED)
 * that do NOT yet have an associated RentalHistory entry, and creates one
 * with source = CORIDOR and isVerified = true.
 *
 * This mirrors the logic from PassportService.onLeaseSigned() but operates
 * in bulk on historical data.
 *
 * Usage:
 *   npx ts-node scripts/backfill-rental-history.ts
 *   npx ts-node scripts/backfill-rental-history.ts --dry-run
 *
 * ⚠️  DO NOT execute automatically. Review the output before running without --dry-run.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

// Map Property.category → RentalPropertyType enum
const categoryMap: Record<string, 'APARTMENT' | 'HOUSE' | 'STUDIO'> = {
  Apartment: 'APARTMENT',
  House: 'HOUSE',
  Studio: 'STUDIO',
};

async function main() {
  console.log('=== Backfill RentalHistory for signed leases ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  // 1. Find all SIGNED applications that don't have a RentalHistory yet
  const applications = await prisma.rentalApplication.findMany({
    where: {
      leaseStatus: 'SIGNED',
      rentalHistory: null, // No RentalHistory linked
    },
    include: {
      listing: {
        include: {
          rentalUnit: { include: { property: true } },
        },
      },
      candidateScope: true,
      financials: { orderBy: { startDate: 'desc' }, take: 1 },
    },
  });

  console.log(`Found ${applications.length} signed lease(s) without RentalHistory.`);
  console.log('');

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const app of applications) {
    const property = app.listing.rentalUnit.property;
    const financial = app.financials[0];

    // Find the TenantProfile for this tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId: app.candidateScope.creatorUserId },
    });

    if (!tenantProfile) {
      console.log(
        `  SKIP [${app.id}] — No TenantProfile for user ${app.candidateScope.creatorUserId}`
      );
      skippedCount++;
      continue;
    }

    const propertyType = categoryMap[property.category] || 'APARTMENT';
    const city = property.city || 'Inconnue';
    const zipCode = property.zipCode || null;
    const rentAmountCents = financial
      ? financial.baseRentCents + financial.serviceChargesCents
      : null;
    const startDate = financial?.startDate || app.leaseStartDate || app.appliedAt;

    console.log(
      `  ${DRY_RUN ? 'WOULD CREATE' : 'CREATING'} RentalHistory:` +
        ` app=${app.id}, tenant=${tenantProfile.id}, city=${city},` +
        ` type=${propertyType}, rent=${rentAmountCents ? rentAmountCents / 100 + '€' : 'N/A'},` +
        ` start=${startDate.toISOString().split('T')[0]}`
    );

    if (!DRY_RUN) {
      try {
        await prisma.rentalHistory.create({
          data: {
            tenantProfileId: tenantProfile.id,
            source: 'CORIDOR',
            rentalApplicationId: app.id,
            city,
            zipCode,
            propertyType,
            rentAmountCents,
            startDate,
            isVerified: true,
          },
        });
        createdCount++;
      } catch (error: any) {
        // Handle unique constraint violation (already exists)
        if (error.code === 'P2002') {
          console.log(`    → Already exists (unique constraint), skipping.`);
          skippedCount++;
        } else {
          console.error(`    → ERROR: ${error.message}`);
          errorCount++;
        }
      }
    } else {
      createdCount++;
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`  ${DRY_RUN ? 'Would create' : 'Created'}: ${createdCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  if (errorCount > 0) console.log(`  Errors: ${errorCount}`);
  console.log('');

  if (DRY_RUN) {
    console.log('This was a dry run. Run without --dry-run to apply changes.');
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
